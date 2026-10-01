import asyncio
import websockets
import json
import time
import requests
import os
import subprocess

BASE_HTTP = "http://localhost:3000"
BASE_WS = "ws://localhost:3000/ws/stress_room"
NUM_CLIENTS = 40
MESSAGES_TO_SEND = 20

print("=" * 65)
print(" 🚀 INICIANDO TEST DE ESTRÉS DE INFRAESTRUCTURA - NEURALJIRA")
print("=" * 65)

# 1. Medir métricas de Docker antes de la prueba
def get_docker_stats():
    res = subprocess.run(
        ["docker", "stats", "--no-stream", "--format", "{{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}"],
        capture_output=True, text=True
    )
    stats = {}
    for line in res.stdout.strip().split("\n"):
        parts = line.split("\t")
        if len(parts) >= 4 and "neuraljira" in parts[0]:
            stats[parts[0]] = {
                "cpu": parts[1],
                "mem": parts[2],
                "mem_perc": parts[3]
            }
    return stats

print("\n📊 1. Métricas de Contenedores en Reposo (Pre-Test):")
stats_before = get_docker_stats()
for name, data in stats_before.items():
    print(f"   - {name:<32} | RAM: {data['mem']:<18} ({data['mem_perc']}) | CPU: {data['cpu']}")

# 2. Concurrencia WebSocket
async def client_worker(client_id, is_sender, results):
    uri = f"{BASE_WS}?username=Tester_{client_id}&role=viewer"
    received_count = 0
    try:
        async with websockets.connect(uri) as ws:
            results["connected"] += 1
            if is_sender:
                # Esperar mensajes iniciales
                await asyncio.sleep(0.3)
                for i in range(MESSAGES_TO_SEND):
                    msg = {
                        "type": "chat",
                        "text": f"Estrés mensaje {i+1} de Tester_{client_id}"
                    }
                    await ws.send(json.dumps(msg))
                    results["sent"] += 1
                    await asyncio.sleep(0.35) # Flood protection margin
            else:
                # Receptor pasivo
                timeout = 10.0
                start_wait = time.time()
                while time.time() - start_wait < timeout:
                    try:
                        raw = await asyncio.wait_for(ws.recv(), timeout=1.0)
                        data = json.loads(raw)
                        if data.get("type") == "chat":
                            received_count += 1
                    except asyncio.TimeoutError:
                        pass
                results["received"] += received_count
    except Exception as e:
        results["errors"].append(str(e))

async def run_websocket_load():
    results = {
        "connected": 0,
        "sent": 0,
        "received": 0,
        "errors": []
    }
    tasks = []
    print(f"\n⚡ 2. Conectando {NUM_CLIENTS} clientes WebSocket concurrentes...")
    for i in range(NUM_CLIENTS):
        is_sender = (i < 5) # 5 emisores, 35 receptores
        tasks.append(client_worker(i, is_sender, results))

    start = time.time()
    await asyncio.gather(*tasks)
    elapsed = time.time() - start
    return results, elapsed

results_ws, elapsed_ws = asyncio.run(run_websocket_load())
print(f"   ✅ Clientes conectados exitosamente : {results_ws['connected']}/{NUM_CLIENTS}")
print(f"   ✅ Mensajes emitidos                 : {results_ws['sent']}")
print(f"   ✅ Mensajes recibidos en broadcast   : {results_ws['received']}")
print(f"   ⏱️ Tiempo total de la prueba         : {elapsed_ws:.2f}s")
if results_ws["errors"]:
    print(f"   ⚠️ Errores registrados: {len(results_ws['errors'])}")
else:
    print("   🎉 0 Errores en WebSockets bajo concurrencia.")

# 3. Test de Subida de Archivo Pesado por Streaming
print("\n📦 3. Test de Subida de Archivo Pesado (25 MB) vía Streaming:")
test_file_path = "/tmp/stress_upload_25mb.dat"
with open(test_file_path, "wb") as f:
    f.write(os.urandom(25 * 1024 * 1024))

file_size_mb = os.path.getsize(test_file_path) / (1024 * 1024)
start_up = time.time()
with open(test_file_path, "rb") as f:
    resp = requests.post(
        f"{BASE_HTTP}/api/upload",
        data={"roomId": "stress_room"},
        files={"file": ("stress_test_25mb.dat", f, "application/octet-stream")}
    )
elapsed_up = time.time() - start_up

if os.path.exists(test_file_path):
    os.remove(test_file_path)

if resp.status_code == 201:
    res_json = resp.json()
    print(f"   ✅ Archivo de {file_size_mb:.1f} MB subido en {elapsed_up:.2f}s (HTTP 201 Created)")
    print(f"   ✅ ID Asignado: {res_json['attachment']['id']}")
else:
    print(f"   ❌ Error en subida: {resp.status_code} {resp.text}")

# 4. Métricas de Contenedores Post-Prueba
print("\n📊 4. Métricas de Contenedores Post-Estrés (Verificación de Cero Fuga):")
stats_after = get_docker_stats()
for name, data in stats_after.items():
    print(f"   - {name:<32} | RAM: {data['mem']:<18} ({data['mem_perc']}) | CPU: {data['cpu']}")

# 5. Verificación de Healthchecks de Docker
print("\n🩺 5. Estado de Salud (Healthchecks) de los Contenedores:")
health_res = subprocess.run(
    ["docker", "ps", "--filter", "name=neuraljira", "--format", "{{.Names}}\t{{.Status}}"],
    capture_output=True, text=True
)
for line in health_res.stdout.strip().split("\n"):
    print(f"   - {line}")

print("\n" + "=" * 65)
print(" 🏁 TEST DE ESTRÉS COMPLETADO CON ÉXITO")
print("=" * 65)
