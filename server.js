const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8000;
const DATA_FILE = path.join(__dirname, 'custom_categories.json');

// List of active Server-Sent Events clients
let clients = [];

// Helper to read custom categories from filesystem
function readCategories() {
  if (!fs.existsSync(DATA_FILE)) {
    return {};
  }
  try {
    const content = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading categories file:", err);
    return {};
  }
}

// Helper to write custom categories to filesystem
function writeCategories(categories) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(categories, null, 2), 'utf8');
  } catch (err) {
    console.error("Error writing categories file:", err);
  }
}

const server = http.createServer((req, res) => {
  // 1. API: Server-Sent Events for real-time synchronization
  if (req.url === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    
    // Send initial keep-alive ping
    res.write(': ok\n\n');
    clients.push(res);
    
    req.on('close', () => {
      clients = clients.filter(c => c !== res);
    });
    return;
  }

  // 2. API: GET categories
  if (req.url === '/api/categories' && req.method === 'GET') {
    res.writeHead(200, { 
      'Content-Type': 'application/json', 
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-store'
    });
    res.end(JSON.stringify(readCategories()));
    return;
  }

  // 3. API: POST categories (Save and broadcast)
  if (req.url === '/api/categories' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const categories = data.categories || {};
        writeCategories(categories);
        
        // Broadcast update to all SSE clients
        clients.forEach(client => {
          client.write(`data: ${JSON.stringify({ type: 'UPDATE', categories })}\n\n`);
        });
        
        res.writeHead(200, { 
          'Content-Type': 'application/json', 
          'Access-Control-Allow-Origin': '*' 
        });
        res.end(JSON.stringify({ success: true }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Invalid JSON payload' }));
      }
    });
    return;
  }

  // 4. Static files server
  const cleanUrl = req.url.split('?')[0];
  let uri = cleanUrl === '/' ? '/index.html' : cleanUrl;
  
  // Safe path resolution
  let filePath = path.join(__dirname, uri);
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(filePath);
  let contentType = 'text/html';
  switch (extname) {
    case '.js': contentType = 'text/javascript'; break;
    case '.css': contentType = 'text/css'; break;
    case '.json': contentType = 'application/json'; break;
    case '.png': contentType = 'image/png'; break;
    case '.jpg': contentType = 'image/jpg'; break;
    case '.webp': contentType = 'image/webp'; break;
    case '.wav': contentType = 'audio/wav'; break;
    case '.mp3': contentType = 'audio/mpeg'; break;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404);
        res.end('File Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`PartyFun server running at http://localhost:${PORT}/`);
  console.log(`On local network, access via: http://<YOUR_IP_ADDRESS>:${PORT}/`);
});
