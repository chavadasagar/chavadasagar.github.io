import { isUrlValid, formatUrl } from "./validation/validation.js";

document.addEventListener("DOMContentLoaded", () => {
  // DOM Elements
  const postmanForm = document.getElementById("postmanform");
  const requestMethodSelect = document.getElementById("requestMethod");
  const requestUrlInput = document.getElementById("requestUrl");
  const btnSend = document.getElementById("btnSend");
  const btnSendText = document.getElementById("btnSendText");
  const btnSendSpinner = document.getElementById("btnSendSpinner");

  // Tab Containers
  const queryParamsContainer = document.getElementById("queryParamsContainer");
  const headersContainer = document.getElementById("headersContainer");
  const formBodyContainer = document.getElementById("formBodyContainer");
  
  const btnAddParam = document.getElementById("btnAddParam");
  const btnAddHeader = document.getElementById("btnAddHeader");
  const btnAddFormParam = document.getElementById("btnAddFormParam");

  // Body Radio Elements
  const bodyTypeRadios = document.getElementsByName("bodyType");
  const jsonBodySection = document.getElementById("jsonBodySection");
  const formBodySection = document.getElementById("formBodySection");
  const jsonstringInput = document.getElementById("jsonstring");
  const btnFormatJson = document.getElementById("btnFormatJson");

  // Auth Elements
  const authTypeSelect = document.getElementById("authType");
  const bearerAuthBox = document.getElementById("bearerAuthBox");
  const basicAuthBoxes = document.querySelectorAll(".basicAuthBox");
  const authTokenInput = document.getElementById("authToken");
  const authUsernameInput = document.getElementById("authUsername");
  const authPasswordInput = document.getElementById("authPassword");

  // Response Elements
  const responseStatusBadge = document.getElementById("responseStatusBadge");
  const responseMeta = document.getElementById("responseMeta");
  const responseTimeEl = document.getElementById("responseTime");
  const responseSizeEl = document.getElementById("responseSize");
  const responseText = document.getElementById("responsetext");
  const responseHeadersBox = document.getElementById("responseHeadersBox");
  const btnCopyResponse = document.getElementById("btnCopyResponse");

  // Preset & History Elements
  const presetBtn = document.getElementById("presetBtn");
  const historyList = document.getElementById("historyList");
  const btnClearHistory = document.getElementById("btnClearHistory");

  // Helper: Method Color Update
  function updateMethodSelectColor() {
    const val = requestMethodSelect.value.toLowerCase();
    requestMethodSelect.className = `form-select method-select method-${val}`;
  }
  requestMethodSelect.addEventListener("change", updateMethodSelectColor);
  updateMethodSelectColor();

  // Helper: Create Key-Value Row
  function createKvRow(key = "", value = "") {
    const row = document.createElement("div");
    row.className = "kv-row";

    const keyInput = document.createElement("input");
    keyInput.type = "text";
    keyInput.className = "form-control kv-input kv-key";
    keyInput.placeholder = "Key";
    keyInput.value = key;

    const valInput = document.createElement("input");
    valInput.type = "text";
    valInput.className = "form-control kv-input kv-val";
    valInput.placeholder = "Value";
    valInput.value = value;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "btn-icon";
    deleteBtn.innerHTML = `<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    deleteBtn.addEventListener("click", () => row.remove());

    row.appendChild(keyInput);
    row.appendChild(valInput);
    row.appendChild(deleteBtn);

    return row;
  }

  // Add initial rows
  queryParamsContainer.appendChild(createKvRow());
  headersContainer.appendChild(createKvRow("Content-Type", "application/json"));
  formBodyContainer.appendChild(createKvRow());

  // Add Row Event Listeners
  btnAddParam.addEventListener("click", () => queryParamsContainer.appendChild(createKvRow()));
  btnAddHeader.addEventListener("click", () => headersContainer.appendChild(createKvRow()));
  btnAddFormParam.addEventListener("click", () => formBodyContainer.appendChild(createKvRow()));

  // Body Type Radio Switching
  bodyTypeRadios.forEach(radio => {
    radio.addEventListener("change", (e) => {
      const selected = e.target.value;
      if (selected === "json") {
        jsonBodySection.classList.remove("d-none");
        formBodySection.classList.add("d-none");
      } else if (selected === "form") {
        jsonBodySection.classList.add("d-none");
        formBodySection.classList.remove("d-none");
      } else {
        jsonBodySection.classList.add("d-none");
        formBodySection.classList.add("d-none");
      }
    });
  });

  // Prettify JSON
  btnFormatJson.addEventListener("click", () => {
    const raw = jsonstringInput.value.trim();
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      jsonstringInput.value = JSON.stringify(parsed, null, 2);
    } catch (err) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ title: "Invalid JSON", text: err.message, icon: "error", background: "#1e293b", color: "#fff" });
      } else {
        alert("Invalid JSON: " + err.message);
      }
    }
  });

  // Auth Type Switching
  authTypeSelect.addEventListener("change", (e) => {
    const type = e.target.value;
    if (type === "bearer") {
      bearerAuthBox.classList.remove("d-none");
      basicAuthBoxes.forEach(b => b.classList.add("d-none"));
    } else if (type === "basic") {
      bearerAuthBox.classList.add("d-none");
      basicAuthBoxes.forEach(b => b.classList.remove("d-none"));
    } else {
      bearerAuthBox.classList.add("d-none");
      basicAuthBoxes.forEach(b => b.classList.add("d-none"));
    }
  });

  // Helper: Extract Key-Values from container
  function getKvPairs(container) {
    const rows = container.querySelectorAll(".kv-row");
    const result = {};
    rows.forEach(row => {
      const key = row.querySelector(".kv-key").value.trim();
      const val = row.querySelector(".kv-val").value.trim();
      if (key) {
        result[key] = val;
      }
    });
    return result;
  }

  // Preset Sample Loader
  presetBtn.addEventListener("click", () => {
    requestMethodSelect.value = "POST";
    updateMethodSelectColor();
    requestUrlInput.value = "https://jsonplaceholder.typicode.com/posts";
    
    // Set Body JSON radio
    document.getElementById("bodyTypeJson").checked = true;
    jsonBodySection.classList.remove("d-none");
    formBodySection.classList.add("d-none");
    
    jsonstringInput.value = JSON.stringify({
      title: "Mobile Friendly Web Postman",
      body: "Testing API calls directly from modern web studio",
      userId: 1
    }, null, 2);

    if (typeof Swal !== "undefined") {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: 'Sample request loaded!',
        showConfirmButton: false,
        timer: 2000,
        background: '#1e293b',
        color: '#fff'
      });
    }
  });

  // Copy Response
  btnCopyResponse.addEventListener("click", () => {
    const content = responseText.innerText;
    if (!content || content.includes("Submit a request to see")) return;
    navigator.clipboard.writeText(content).then(() => {
      if (typeof Swal !== "undefined") {
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Copied to clipboard!',
          showConfirmButton: false,
          timer: 1500,
          background: '#1e293b',
          color: '#fff'
        });
      }
    });
  });

  // History Management
  function loadHistory() {
    const history = JSON.parse(localStorage.getItem("postman_history") || "[]");
    if (history.length === 0) {
      historyList.innerHTML = `<div class="text-center text-muted py-4">No history recorded yet</div>`;
      return;
    }
    historyList.innerHTML = "";
    history.forEach((item, index) => {
      const div = document.createElement("div");
      div.className = "history-item";
      const methodClass = `method-${item.method.toLowerCase()}`;
      div.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-1">
          <span class="${methodClass} fw-bold">${item.method}</span>
          <small class="text-muted">${item.timestamp}</small>
        </div>
        <div class="text-truncate text-light small">${item.url}</div>
      `;
      div.addEventListener("click", () => {
        requestMethodSelect.value = item.method;
        updateMethodSelectColor();
        requestUrlInput.value = item.url;
        // Close offcanvas if bootstrap is active
        const bsOffcanvas = bootstrap.Offcanvas.getInstance(document.getElementById("historyOffcanvas"));
        if (bsOffcanvas) bsOffcanvas.hide();
      });
      historyList.appendChild(div);
    });
  }

  function saveToHistory(method, url) {
    let history = JSON.parse(localStorage.getItem("postman_history") || "[]");
    const newItem = {
      method,
      url,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    // Add to beginning and cap at 15 items
    history.unshift(newItem);
    if (history.length > 15) history = history.slice(0, 15);
    localStorage.setItem("postman_history", JSON.stringify(history));
    loadHistory();
  }

  btnClearHistory.addEventListener("click", () => {
    localStorage.removeItem("postman_history");
    loadHistory();
  });

  loadHistory();

  // Submit Request Handler
  postmanForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    let rawUrl = requestUrlInput.value.trim();
    if (!rawUrl) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ title: "Missing URL", text: "Please enter a valid target URL", icon: "warning", background: "#1e293b", color: "#fff" });
      }
      return;
    }

    let finalUrl = formatUrl(rawUrl);
    requestUrlInput.value = finalUrl;

    if (!isUrlValid(finalUrl)) {
      if (typeof Swal !== "undefined") {
        Swal.fire({ title: "Invalid URL", text: "Please enter a valid HTTP/HTTPS URL", icon: "error", background: "#1e293b", color: "#fff" });
      }
      return;
    }

    // Append Query Parameters to URL
    const queryParams = getKvPairs(queryParamsContainer);
    const urlObj = new URL(finalUrl);
    Object.keys(queryParams).forEach(k => urlObj.searchParams.append(k, queryParams[k]));
    finalUrl = urlObj.toString();

    // Collect Headers
    const headers = getKvPairs(headersContainer);

    // Apply Authentication Header
    const authType = authTypeSelect.value;
    if (authType === "bearer") {
      const token = authTokenInput.value.trim();
      if (token) headers["Authorization"] = `Bearer ${token}`;
    } else if (authType === "basic") {
      const uname = authUsernameInput.value.trim();
      const pwd = authPasswordInput.value.trim();
      if (uname || pwd) {
        headers["Authorization"] = `Basic ${btoa(`${uname}:${pwd}`)}`;
      }
    }

    // Determine Request Body
    const method = requestMethodSelect.value;
    let bodyPayload = null;
    const selectedBodyType = document.querySelector('input[name="bodyType"]:checked').value;

    if (method !== "GET" && method !== "HEAD") {
      if (selectedBodyType === "json") {
        bodyPayload = jsonstringInput.value.trim();
        if (!headers["Content-Type"]) {
          headers["Content-Type"] = "application/json";
        }
      } else if (selectedBodyType === "form") {
        const formDataPairs = getKvPairs(formBodyContainer);
        const params = new URLSearchParams();
        Object.keys(formDataPairs).forEach(k => params.append(k, formDataPairs[k]));
        bodyPayload = params.toString();
        headers["Content-Type"] = "application/x-www-form-urlencoded";
      }
    }

    // Set UI Loading State
    btnSend.disabled = true;
    btnSendText.textContent = "Sending...";
    btnSendSpinner.classList.remove("d-none");
    responseText.textContent = "Fetching response...";
    responseStatusBadge.classList.add("d-none");
    responseMeta.classList.add("d-none");

    const startTime = performance.now();

    try {
      const response = await fetch(finalUrl, {
        method: method,
        headers: headers,
        body: bodyPayload
      });

      const endTime = performance.now();
      const timeTaken = Math.round(endTime - startTime);

      // Extract Status
      const status = response.status;
      const statusText = response.statusText || (status === 200 ? "OK" : "");
      responseStatusBadge.textContent = `${status} ${statusText}`;
      responseStatusBadge.className = `status-badge ${
        status >= 200 && status < 300 ? "status-2xx" :
        status >= 300 && status < 400 ? "status-3xx" :
        status >= 400 && status < 500 ? "status-4xx" : "status-5xx"
      }`;
      responseStatusBadge.classList.remove("d-none");

      // Extract Response Headers
      let respHeaderStr = "";
      response.headers.forEach((val, key) => {
        respHeaderStr += `${key}: ${val}\n`;
      });
      responseHeadersBox.textContent = respHeaderStr || "No headers returned";

      // Extract Response Content & Size
      const textData = await response.text();
      const sizeInBytes = new Blob([textData]).size;
      const sizeStr = sizeInBytes > 1024 ? `${(sizeInBytes / 1024).toFixed(2)} KB` : `${sizeInBytes} B`;

      responseTimeEl.textContent = `${timeTaken} ms`;
      responseSizeEl.textContent = sizeStr;
      responseMeta.classList.remove("d-none");

      // Pretty Format Response Text
      try {
        const jsonFormatted = JSON.parse(textData);
        responseText.textContent = JSON.stringify(jsonFormatted, null, 2);
      } catch (_) {
        responseText.textContent = textData || "[Empty Response]";
      }

      // Save to History
      saveToHistory(method, finalUrl);

    } catch (err) {
      const endTime = performance.now();
      const timeTaken = Math.round(endTime - startTime);

      responseStatusBadge.textContent = "Error";
      responseStatusBadge.className = "status-badge status-5xx";
      responseStatusBadge.classList.remove("d-none");
      
      responseTimeEl.textContent = `${timeTaken} ms`;
      responseSizeEl.textContent = "0 B";
      responseMeta.classList.remove("d-none");

      responseText.textContent = `Request Failed:\n${err.message}\n\nNote: If requesting a cross-origin resource, make sure CORS is enabled or use a CORS proxy.`;
      responseHeadersBox.textContent = "No headers available due to request failure.";
    } finally {
      btnSend.disabled = false;
      btnSendText.textContent = "Send";
      btnSendSpinner.classList.add("d-none");
    }
  });
});