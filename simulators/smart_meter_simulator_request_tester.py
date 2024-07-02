from http.server import BaseHTTPRequestHandler, HTTPServer
import time
import random
import json

hostName = "localhost"
serverPort = 8080

requests_per_second = 0
requests = 0
start = time.time()

class MyServer(BaseHTTPRequestHandler):
    def do_GET(self):
        global requests_per_second, requests, start

        requests += 1

        requests_per_second = requests / (time.time() - start)

        print(f"Requests per Second: {requests_per_second}, Runningtime: {time.time() - start}")

        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.end_headers()
        self.wfile.write(json.dumps(random.randint(500,1000)).encode("utf-8"))

if __name__ == "__main__":        
    webServer = HTTPServer((hostName, serverPort), MyServer)
    print("Server started http://%s:%s" % (hostName, serverPort))

    try:
        webServer.serve_forever()
    except KeyboardInterrupt:
        pass

    webServer.server_close()
    print("Server stopped.")