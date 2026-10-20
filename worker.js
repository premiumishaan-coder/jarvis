// Jarvis access server for Cloudflare Workers (free plan).
// Needs: a KV namespace bound as USERS, secrets GEMINI_KEY and ADMIN_PASSWORD.
const GEMINI = "https://generativelanguage.googleapis.com";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-access-key",
  "Access-Control-Max-Age": "86400"
};
const ADMIN_HTML = "<!doctype html>\n<html lang=\"en\"><head><meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"robots\" content=\"noindex\">\n<title>Jarvis Access Panel</title>\n<style>\n:root{--bg:#04080c;--panel:#0a1219;--line:#16323f;--accent:#2fe3ff;--fg:#d6e6ee;--muted:#6f8793;--bad:#ff6b6b;--ok:#5be39a;color-scheme:dark}\n*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font:16px system-ui,sans-serif;padding:16px;max-width:640px;margin-inline:auto}\nh1{font-size:1.2rem;letter-spacing:.14em;text-transform:uppercase;color:var(--accent);margin:8px 0 14px}\nh2{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:22px 0 8px}\ninput{width:100%;background:var(--panel);color:var(--fg);border:1px solid var(--line);border-radius:10px;padding:12px;font:inherit}\ninput:focus,button:focus{outline:2px solid var(--accent)}\nbutton{font:inherit;border:1px solid var(--accent);background:var(--accent);color:#001015;border-radius:10px;padding:10px 14px;font-weight:600}\nbutton.g{background:none;color:var(--accent)}button.d{background:none;color:var(--bad);border-color:var(--bad)}\n.row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}\n.card{background:var(--panel);border:1px solid var(--line);border-radius:12px;padding:12px;margin-bottom:10px}\n.card b{display:block;overflow-wrap:anywhere}.m{color:var(--muted);font-size:.82rem;font-family:ui-monospace,monospace;overflow-wrap:anywhere}\n.pill{display:inline-block;border-radius:99px;padding:1px 9px;font-size:.75rem;border:1px solid}\n.on{color:var(--ok);border-color:var(--ok)}.off{color:var(--bad);border-color:var(--bad)}\n#msg{margin-top:10px;color:var(--muted);min-height:1.3em;overflow-wrap:anywhere}\n</style></head><body>\n<h1>Jarvis access panel</h1>\n<div id=\"login\">\n  <input id=\"pw\" type=\"password\" placeholder=\"Admin password\" autocomplete=\"current-password\">\n  <div class=\"row\"><button id=\"go\">Sign in</button></div>\n</div>\n<div id=\"main\" hidden>\n  <h2>Your app address</h2>\n  <input id=\"app\" placeholder=\"https://yourname.github.io/jarvis/jarvis6.html\">\n  <div class=\"m\" style=\"margin-top:6px\">Used to build the invite link you send to people.</div>\n  <h2>Give someone access</h2>\n  <input id=\"nm\" placeholder=\"Name, e.g. Aman\" maxlength=\"40\">\n  <div class=\"row\"><button id=\"add\">Create access key</button></div>\n  <h2>People</h2>\n  <div id=\"list\"></div>\n  <div class=\"row\"><button class=\"g\" id=\"out\">Sign out</button></div>\n</div>\n<div id=\"msg\"></div>\n<script>\nvar pw=\"\";try{pw=sessionStorage.getItem(\"pw\")||\"\"}catch(e){}\nfunction $(i){return document.getElementById(i)}\nfunction say(t){$(\"msg\").textContent=t}\nasync function api(path,body){\n  var r=await fetch(\"/admin/api/\"+path,{method:\"POST\",headers:{\"Authorization\":\"Bearer \"+pw,\"Content-Type\":\"application/json\"},body:JSON.stringify(body||{})});\n  var j=await r.json().catch(function(){return{}});\n  if(!r.ok){throw new Error(j.error||(\"Error \"+r.status))}\n  return j;\n}\nfunction ago(t){if(!t)return\"never\";var s=(Date.now()-t)/1000;if(s<90)return\"just now\";if(s<5400)return Math.round(s/60)+\" min ago\";if(s<129600)return Math.round(s/3600)+\" h ago\";return Math.round(s/86400)+\" days ago\"}\nfunction link(k){var a=$(\"app\").value.trim();if(!a)return\"\";return a+(a.indexOf(\"?\")<0?\"?\":\"&\")+\"s=\"+encodeURIComponent(location.origin)+\"&k=\"+encodeURIComponent(k)}\nfunction copy(t,label){\n  if(!t){say(\"Fill in 'Your app address' first.\");return}\n  (navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(t):Promise.reject()).then(function(){say(label+\" copied.\")},function(){window.prompt&&0;say(t)});\n}\nasync function load(){\n  try{\n    var j=await api(\"list\");\n    $(\"login\").hidden=true;$(\"main\").hidden=false;\n    var box=$(\"list\");box.innerHTML=\"\";\n    if(!j.users.length){box.innerHTML='<div class=\"m\">Nobody yet.</div>'}\n    j.users.forEach(function(u){\n      var c=document.createElement(\"div\");c.className=\"card\";\n      var b=document.createElement(\"b\");b.textContent=u.name;\n      var p=document.createElement(\"span\");p.className=\"pill \"+(u.revoked?\"off\":\"on\");p.textContent=u.revoked?\"REVOKED\":\"ACTIVE\";\n      var m=document.createElement(\"div\");m.className=\"m\";m.textContent=u.key+\"  \u00b7  last used \"+ago(u.last);\n      var r=document.createElement(\"div\");r.className=\"row\";\n      function btn(t,cls,fn){var x=document.createElement(\"button\");x.textContent=t;x.className=cls||\"\";x.onclick=fn;r.appendChild(x)}\n      btn(\"Copy invite link\",\"g\",function(){copy(link(u.key),\"Invite link\")});\n      btn(\"Copy key\",\"g\",function(){copy(u.key,\"Key\")});\n      btn(u.revoked?\"Restore\":\"Revoke\",u.revoked?\"\":\"d\",async function(){try{await api(\"revoke\",{key:u.key,revoked:!u.revoked});say(u.revoked?\"Restored.\":\"Revoked. They lose access within about a minute.\");load()}catch(e){say(e.message)}});\n      btn(\"Delete\",\"d\",async function(){if(this.dataset.s!==\"1\"){this.dataset.s=\"1\";this.textContent=\"Tap again\";return}try{await api(\"delete\",{key:u.key});say(\"Deleted.\");load()}catch(e){say(e.message)}});\n      c.append(b,p,m,r);box.appendChild(c);\n    });\n  }catch(e){say(e.message);$(\"login\").hidden=false;$(\"main\").hidden=true;pw=\"\";}\n}\n$(\"go\").onclick=function(){pw=$(\"pw\").value;try{sessionStorage.setItem(\"pw\",pw)}catch(e){}load()};\n$(\"pw\").addEventListener(\"keydown\",function(e){if(e.key===\"Enter\")$(\"go\").click()});\n$(\"add\").onclick=async function(){var n=$(\"nm\").value.trim();if(!n){say(\"Enter a name first.\");return}try{var j=await api(\"create\",{name:n});$(\"nm\").value=\"\";say(\"Created \"+j.key);load()}catch(e){say(e.message)}};\n$(\"out\").onclick=function(){try{sessionStorage.removeItem(\"pw\")}catch(e){}pw=\"\";location.reload()};\ntry{$(\"app\").value=localStorage.getItem(\"app\")||\"\"}catch(e){}\n$(\"app\").addEventListener(\"input\",function(){try{localStorage.setItem(\"app\",$(\"app\").value)}catch(e){}});\nif(pw){load()}\n</script></body></html>\n";

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });
}
function same(a, b) {            // constant-time string compare
  a = String(a); b = String(b);
  let d = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) d |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return d === 0;
}
function newKey() {
  const abc = "abcdefghjkmnpqrstuvwxyz23456789";
  const r = crypto.getRandomValues(new Uint8Array(22));
  return "jv-" + Array.from(r, x => abc[x % abc.length]).join("");
}
async function isAdmin(req, env) {
  const h = req.headers.get("Authorization") || "";
  const ok = !!env.ADMIN_PASSWORD && same(h.replace(/^Bearer /, ""), env.ADMIN_PASSWORD);
  if (!ok) await new Promise(r => setTimeout(r, 600));   // slow down guessing
  return ok;
}

async function admin(req, env, path) {
  if (!(await isAdmin(req, env))) return json({ error: "Wrong password." }, 401);
  const body = await req.json().catch(() => ({}));
  if (path === "list") {
    const out = []; let cursor;
    do {
      const l = await env.USERS.list({ prefix: "k:", cursor });
      l.keys.forEach(k => out.push({ key: k.name.slice(2), ...(k.metadata || {}) }));
      cursor = l.list_complete ? null : l.cursor;
    } while (cursor);
    out.sort((a, b) => (b.created || 0) - (a.created || 0));
    return json({ users: out });
  }
  if (path === "create") {
    const name = String(body.name || "").trim().slice(0, 40);
    if (!name) return json({ error: "Name required." }, 400);
    const key = newKey(), rec = { name, created: Date.now(), revoked: false, last: 0 };
    await env.USERS.put("k:" + key, JSON.stringify(rec), { metadata: rec });
    return json({ key });
  }
  const key = String(body.key || "");
  const raw = await env.USERS.get("k:" + key);
  if (!raw) return json({ error: "Unknown key." }, 404);
  if (path === "revoke") {
    const rec = { ...JSON.parse(raw), revoked: !!body.revoked };
    await env.USERS.put("k:" + key, JSON.stringify(rec), { metadata: rec });
    return json({ ok: true });
  }
  if (path === "delete") { await env.USERS.delete("k:" + key); return json({ ok: true }); }
  return json({ error: "Not found." }, 404);
}

async function authorize(req, env) {      // returns a Response when access is refused, otherwise null
  const key = req.headers.get("x-access-key") || "";
  if (!/^jv-[a-z0-9]{10,40}$/.test(key)) return json({ error: "Invalid access key." }, 401);
  const raw = await env.USERS.get("k:" + key);
  if (!raw) return json({ error: "Invalid access key." }, 401);
  const rec = JSON.parse(raw);
  if (rec.revoked) return json({ error: "Your access was removed by the owner." }, 403);
  // record last use at most every 10 minutes (KV free plan allows 1000 writes a day)
  if (Date.now() - (rec.last || 0) > 600000) {
    rec.last = Date.now();
    await env.USERS.put("k:" + key, JSON.stringify(rec), { metadata: rec });
  }
  return null;
}

async function proxy(req, env, url) {
  if (req.method === "GET" && url.pathname === "/v1beta/models") {        // list of models the owner's key can use
    const bad = await authorize(req, env); if (bad) return bad;
    const up = await fetch(GEMINI + "/v1beta/models?pageSize=200", { headers: { "x-goog-api-key": env.GEMINI_KEY } });
    return new Response(up.body, { status: up.status, headers: { "Content-Type": "application/json", ...CORS } });
  }
  const m = /^\/v1beta\/models\/([\w.\-]+):generateContent$/.exec(url.pathname);
  if (!m || req.method !== "POST") return json({ error: "Not found." }, 404);
  const bad = await authorize(req, env); if (bad) return bad;
  const text = await req.text();
  if (text.length > 400000) return json({ error: "Request too large." }, 413);
  const up = await fetch(GEMINI + "/v1beta/models/" + m[1] + ":generateContent", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_KEY },
    body: text
  });
  return new Response(up.body, { status: up.status, headers: { "Content-Type": up.headers.get("Content-Type") || "application/json", ...CORS } });
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    const url = new URL(req.url);
    if (url.pathname === "/admin") return new Response(ADMIN_HTML, { headers: { "Content-Type": "text/html; charset=utf-8", "X-Robots-Tag": "noindex" } });
    if (url.pathname.startsWith("/admin/api/")) return admin(req, env, url.pathname.slice(11));
    if (url.pathname === "/") return new Response("Jarvis access server is running.", { headers: CORS });
    try { return await proxy(req, env, url); }
    catch (e) { return json({ error: "Server error." }, 500); }
  }
};
