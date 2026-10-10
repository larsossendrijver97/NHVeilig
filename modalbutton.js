console.log("✅ External JavaScript loaded successfully!");

document.body.insertAdjacentHTML(
  "beforeend",
  '<div style="position:fixed;bottom:20px;right:20px;padding:15px 20px;background:#111;color:#fff;border-radius:8px;z-index:99999;font-family:Arial,sans-serif;">External JS works ✅</div>'
);
