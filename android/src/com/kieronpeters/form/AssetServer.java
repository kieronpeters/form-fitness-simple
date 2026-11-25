package com.kieronpeters.form;

import android.content.res.AssetManager;
import android.util.Log;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Serves the bundled Form Fitness build from assets/www over a loopback HTTP origin.
 * A fixed loopback origin gives the WebView persistent localStorage/IndexedDB,
 * and localhost is treated as a secure context, so the PWA works offline.
 */
final class AssetServer {
    private static final String TAG = "FormAssetServer";
    private final AssetManager assets;
    private final int port;
    private final Map<String, String> mimeTypes = new HashMap<>();
    private ServerSocket serverSocket;
    private Thread acceptThread;
    private volatile boolean running;

    AssetServer(AssetManager assets, int port) {
        this.assets = assets;
        this.port = port;
        mimeTypes.put("html", "text/html; charset=utf-8");
        mimeTypes.put("js", "application/javascript; charset=utf-8");
        mimeTypes.put("css", "text/css; charset=utf-8");
        mimeTypes.put("json", "application/json; charset=utf-8");
        mimeTypes.put("webmanifest", "application/manifest+json; charset=utf-8");
        mimeTypes.put("svg", "image/svg+xml");
        mimeTypes.put("png", "image/png");
        mimeTypes.put("jpg", "image/jpeg");
        mimeTypes.put("jpeg", "image/jpeg");
        mimeTypes.put("webp", "image/webp");
        mimeTypes.put("ico", "image/x-icon");
        mimeTypes.put("woff", "font/woff");
        mimeTypes.put("woff2", "font/woff2");
        mimeTypes.put("ttf", "font/ttf");
        mimeTypes.put("txt", "text/plain; charset=utf-8");
    }

    void start() throws IOException {
        serverSocket = new ServerSocket();
        serverSocket.setReuseAddress(true);
        serverSocket.bind(new InetSocketAddress(InetAddress.getByName("127.0.0.1"), port));
        running = true;
        acceptThread = new Thread(new Runnable() {
            @Override
            public void run() {
                while (running) {
                    try {
                        final Socket socket = serverSocket.accept();
                        Thread request = new Thread(new Runnable() {
                            @Override
                            public void run() {
                                handle(socket);
                            }
                        }, "form-asset-request");
                        request.setDaemon(true);
                        request.start();
                    } catch (IOException error) {
                        if (running) {
                            Log.w(TAG, "Accept failed", error);
                        }
                    }
                }
            }
        }, "form-assets");
        acceptThread.setDaemon(true);
        acceptThread.start();
    }

    void stop() {
        running = false;
        if (serverSocket != null) {
            try {
                serverSocket.close();
            } catch (IOException ignored) {
                // The app is shutting down.
            }
        }
    }

    private void handle(Socket socket) {
        try (Socket client = socket) {
            client.setSoTimeout(5000);
            String requestLine = readLine(client.getInputStream());
            if (requestLine == null || requestLine.isEmpty()) {
                return;
            }
            readRequestHeaders(client.getInputStream());

            String[] parts = requestLine.split(" ");
            if (parts.length < 2) {
                return;
            }
            String path = parts[1];
            int queryIndex = path.indexOf('?');
            if (queryIndex >= 0) {
                path = path.substring(0, queryIndex);
            }
            path = URLDecoder.decode(path, StandardCharsets.UTF_8.name());
            if (path.equals("/")) {
                path = "/index.html";
            }
            if (path.contains("..")) {
                send(client, 404, "text/plain; charset=utf-8", "Not found".getBytes(StandardCharsets.UTF_8));
                return;
            }

            byte[] body;
            try (InputStream input = assets.open("www" + path)) {
                body = readAll(input);
            } catch (IOException missing) {
                if (path.lastIndexOf('.') <= path.lastIndexOf('/')) {
                    // Unknown extensionless path: let the client router handle it.
                    try (InputStream input = assets.open("www/index.html")) {
                        body = readAll(input);
                        send(client, 200, mimeTypes.get("html"), body);
                        return;
                    } catch (IOException fatal) {
                        send(client, 500, "text/plain; charset=utf-8", "App shell unavailable".getBytes(StandardCharsets.UTF_8));
                        return;
                    }
                }
                send(client, 404, "text/plain; charset=utf-8", "Not found".getBytes(StandardCharsets.UTF_8));
                return;
            }

            send(client, 200, mimeFor(path), body);
        } catch (Exception error) {
            Log.w(TAG, "Request failed", error);
        }
    }

    private String mimeFor(String path) {
        int dot = path.lastIndexOf('.');
        if (dot >= 0) {
            String extension = path.substring(dot + 1).toLowerCase(Locale.US);
            String type = mimeTypes.get(extension);
            if (type != null) {
                return type;
            }
        }
        return "application/octet-stream";
    }

    private static void send(Socket client, int status, String contentType, byte[] body) throws IOException {
        OutputStream output = client.getOutputStream();
        String reason = status == 200 ? "OK" : status == 404 ? "Not Found" : "Server Error";
        String headers = "HTTP/1.1 " + status + " " + reason + "\r\n"
                + "Content-Type: " + contentType + "\r\n"
                + "Content-Length: " + body.length + "\r\n"
                + "Cache-Control: no-cache\r\n"
                + "Connection: close\r\n"
                + "\r\n";
        output.write(headers.getBytes(StandardCharsets.US_ASCII));
        output.write(body);
        output.flush();
    }

    private static String readLine(InputStream input) throws IOException {
        ByteArrayOutputStream line = new ByteArrayOutputStream();
        int current;
        while ((current = input.read()) != -1) {
            if (current == '\n') {
                break;
            }
            if (current != '\r') {
                line.write(current);
            }
            if (line.size() > 16 * 1024) {
                break;
            }
        }
        return line.size() == 0 ? null : line.toString(StandardCharsets.US_ASCII.name());
    }

    private static void readRequestHeaders(InputStream input) throws IOException {
        int matched = 0;
        int current;
        while ((current = input.read()) != -1) {
            if (current == '\r') {
                continue;
            }
            if (current == '\n') {
                matched++;
                if (matched == 2) {
                    return;
                }
            } else {
                matched = 0;
            }
        }
    }

    private static byte[] readAll(InputStream input) throws IOException {
        ByteArrayOutputStream output = new ByteArrayOutputStream();
        byte[] buffer = new byte[16384];
        int count;
        while ((count = input.read(buffer)) != -1) {
            output.write(buffer, 0, count);
        }
        return output.toByteArray();
    }
}
