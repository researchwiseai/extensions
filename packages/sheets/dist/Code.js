var __create = Object.create;
var __getProtoOf = Object.getPrototypeOf;
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __toESM = (mod, isNodeMode, target) => {
  target = mod != null ? __create(__getProtoOf(mod)) : {};
  const to = isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target;
  for (let key of __getOwnPropNames(mod))
  if (!__hasOwnProp.call(to, key))
  __defProp(to, key, {
    get: () => mod[key],
    enumerable: true
  });
  return to;
};
var __commonJS = (cb, mod) => () => (mod || cb((mod = { exports: {} }).exports, mod), mod.exports);

// ../../node_modules/cross-fetch/dist/browser-ponyfill.js
var require_browser_ponyfill = __commonJS((exports, module) => {
  var __global__ = typeof globalThis !== "undefined" && globalThis || typeof self !== "undefined" && self || typeof global !== "undefined" && global;
  var __globalThis__ = function () {
    function F() {
      this.fetch = false;
      this.DOMException = __global__.DOMException;
    }
    F.prototype = __global__;
    return new F();
  }();
  (function (globalThis2) {
    var irrelevant = function (exports2) {
      var g = typeof globalThis2 !== "undefined" && globalThis2 || typeof self !== "undefined" && self || typeof global !== "undefined" && global || {};
      var support = {
        searchParams: "URLSearchParams" in g,
        iterable: "Symbol" in g && "iterator" in Symbol,
        blob: "FileReader" in g && "Blob" in g && function () {
          try {
            new Blob();
            return true;
          } catch (e) {
            return false;
          }
        }(),
        formData: "FormData" in g,
        arrayBuffer: "ArrayBuffer" in g
      };
      function isDataView(obj) {
        return obj && DataView.prototype.isPrototypeOf(obj);
      }
      if (support.arrayBuffer) {
        var viewClasses = [
        "[object Int8Array]",
        "[object Uint8Array]",
        "[object Uint8ClampedArray]",
        "[object Int16Array]",
        "[object Uint16Array]",
        "[object Int32Array]",
        "[object Uint32Array]",
        "[object Float32Array]",
        "[object Float64Array]"];

        var isArrayBufferView = ArrayBuffer.isView || function (obj) {
          return obj && viewClasses.indexOf(Object.prototype.toString.call(obj)) > -1;
        };
      }
      function normalizeName(name) {
        if (typeof name !== "string") {
          name = String(name);
        }
        if (/[^a-z0-9\-#$%&'*+.^_`|~!]/i.test(name) || name === "") {
          throw new TypeError('Invalid character in header field name: "' + name + '"');
        }
        return name.toLowerCase();
      }
      function normalizeValue(value) {
        if (typeof value !== "string") {
          value = String(value);
        }
        return value;
      }
      function iteratorFor(items) {
        var iterator = {
          next: function () {
            var value = items.shift();
            return { done: value === undefined, value };
          }
        };
        if (support.iterable) {
          iterator[Symbol.iterator] = function () {
            return iterator;
          };
        }
        return iterator;
      }
      function Headers(headers) {
        this.map = {};
        if (headers instanceof Headers) {
          headers.forEach(function (value, name) {
            this.append(name, value);
          }, this);
        } else if (Array.isArray(headers)) {
          headers.forEach(function (header) {
            if (header.length != 2) {
              throw new TypeError("Headers constructor: expected name/value pair to be length 2, found" + header.length);
            }
            this.append(header[0], header[1]);
          }, this);
        } else if (headers) {
          Object.getOwnPropertyNames(headers).forEach(function (name) {
            this.append(name, headers[name]);
          }, this);
        }
      }
      Headers.prototype.append = function (name, value) {
        name = normalizeName(name);
        value = normalizeValue(value);
        var oldValue = this.map[name];
        this.map[name] = oldValue ? oldValue + ", " + value : value;
      };
      Headers.prototype["delete"] = function (name) {
        delete this.map[normalizeName(name)];
      };
      Headers.prototype.get = function (name) {
        name = normalizeName(name);
        return this.has(name) ? this.map[name] : null;
      };
      Headers.prototype.has = function (name) {
        return this.map.hasOwnProperty(normalizeName(name));
      };
      Headers.prototype.set = function (name, value) {
        this.map[normalizeName(name)] = normalizeValue(value);
      };
      Headers.prototype.forEach = function (callback, thisArg) {
        for (var name in this.map) {
          if (this.map.hasOwnProperty(name)) {
            callback.call(thisArg, this.map[name], name, this);
          }
        }
      };
      Headers.prototype.keys = function () {
        var items = [];
        this.forEach(function (value, name) {
          items.push(name);
        });
        return iteratorFor(items);
      };
      Headers.prototype.values = function () {
        var items = [];
        this.forEach(function (value) {
          items.push(value);
        });
        return iteratorFor(items);
      };
      Headers.prototype.entries = function () {
        var items = [];
        this.forEach(function (value, name) {
          items.push([name, value]);
        });
        return iteratorFor(items);
      };
      if (support.iterable) {
        Headers.prototype[Symbol.iterator] = Headers.prototype.entries;
      }
      function consumed(body) {
        if (body._noBody)
        return;
        if (body.bodyUsed) {
          return Promise.reject(new TypeError("Already read"));
        }
        body.bodyUsed = true;
      }
      function fileReaderReady(reader) {
        return new Promise(function (resolve, reject) {
          reader.onload = function () {
            resolve(reader.result);
          };
          reader.onerror = function () {
            reject(reader.error);
          };
        });
      }
      function readBlobAsArrayBuffer(blob) {
        var reader = new FileReader();
        var promise = fileReaderReady(reader);
        reader.readAsArrayBuffer(blob);
        return promise;
      }
      function readBlobAsText(blob) {
        var reader = new FileReader();
        var promise = fileReaderReady(reader);
        var match = /charset=([A-Za-z0-9_-]+)/.exec(blob.type);
        var encoding = match ? match[1] : "utf-8";
        reader.readAsText(blob, encoding);
        return promise;
      }
      function readArrayBufferAsText(buf) {
        var view = new Uint8Array(buf);
        var chars = new Array(view.length);
        for (var i = 0; i < view.length; i++) {
          chars[i] = String.fromCharCode(view[i]);
        }
        return chars.join("");
      }
      function bufferClone(buf) {
        if (buf.slice) {
          return buf.slice(0);
        } else {
          var view = new Uint8Array(buf.byteLength);
          view.set(new Uint8Array(buf));
          return view.buffer;
        }
      }
      function Body() {
        this.bodyUsed = false;
        this._initBody = function (body) {
          this.bodyUsed = this.bodyUsed;
          this._bodyInit = body;
          if (!body) {
            this._noBody = true;
            this._bodyText = "";
          } else if (typeof body === "string") {
            this._bodyText = body;
          } else if (support.blob && Blob.prototype.isPrototypeOf(body)) {
            this._bodyBlob = body;
          } else if (support.formData && FormData.prototype.isPrototypeOf(body)) {
            this._bodyFormData = body;
          } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
            this._bodyText = body.toString();
          } else if (support.arrayBuffer && support.blob && isDataView(body)) {
            this._bodyArrayBuffer = bufferClone(body.buffer);
            this._bodyInit = new Blob([this._bodyArrayBuffer]);
          } else if (support.arrayBuffer && (ArrayBuffer.prototype.isPrototypeOf(body) || isArrayBufferView(body))) {
            this._bodyArrayBuffer = bufferClone(body);
          } else {
            this._bodyText = body = Object.prototype.toString.call(body);
          }
          if (!this.headers.get("content-type")) {
            if (typeof body === "string") {
              this.headers.set("content-type", "text/plain;charset=UTF-8");
            } else if (this._bodyBlob && this._bodyBlob.type) {
              this.headers.set("content-type", this._bodyBlob.type);
            } else if (support.searchParams && URLSearchParams.prototype.isPrototypeOf(body)) {
              this.headers.set("content-type", "application/x-www-form-urlencoded;charset=UTF-8");
            }
          }
        };
        if (support.blob) {
          this.blob = function () {
            var rejected = consumed(this);
            if (rejected) {
              return rejected;
            }
            if (this._bodyBlob) {
              return Promise.resolve(this._bodyBlob);
            } else if (this._bodyArrayBuffer) {
              return Promise.resolve(new Blob([this._bodyArrayBuffer]));
            } else if (this._bodyFormData) {
              throw new Error("could not read FormData body as blob");
            } else {
              return Promise.resolve(new Blob([this._bodyText]));
            }
          };
        }
        this.arrayBuffer = function () {
          if (this._bodyArrayBuffer) {
            var isConsumed = consumed(this);
            if (isConsumed) {
              return isConsumed;
            } else if (ArrayBuffer.isView(this._bodyArrayBuffer)) {
              return Promise.resolve(this._bodyArrayBuffer.buffer.slice(this._bodyArrayBuffer.byteOffset, this._bodyArrayBuffer.byteOffset + this._bodyArrayBuffer.byteLength));
            } else {
              return Promise.resolve(this._bodyArrayBuffer);
            }
          } else if (support.blob) {
            return this.blob().then(readBlobAsArrayBuffer);
          } else {
            throw new Error("could not read as ArrayBuffer");
          }
        };
        this.text = function () {
          var rejected = consumed(this);
          if (rejected) {
            return rejected;
          }
          if (this._bodyBlob) {
            return readBlobAsText(this._bodyBlob);
          } else if (this._bodyArrayBuffer) {
            return Promise.resolve(readArrayBufferAsText(this._bodyArrayBuffer));
          } else if (this._bodyFormData) {
            throw new Error("could not read FormData body as text");
          } else {
            return Promise.resolve(this._bodyText);
          }
        };
        if (support.formData) {
          this.formData = function () {
            return this.text().then(decode);
          };
        }
        this.json = function () {
          return this.text().then(JSON.parse);
        };
        return this;
      }
      var methods = ["CONNECT", "DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT", "TRACE"];
      function normalizeMethod(method) {
        var upcased = method.toUpperCase();
        return methods.indexOf(upcased) > -1 ? upcased : method;
      }
      function Request(input, options) {
        if (!(this instanceof Request)) {
          throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.');
        }
        options = options || {};
        var body = options.body;
        if (input instanceof Request) {
          if (input.bodyUsed) {
            throw new TypeError("Already read");
          }
          this.url = input.url;
          this.credentials = input.credentials;
          if (!options.headers) {
            this.headers = new Headers(input.headers);
          }
          this.method = input.method;
          this.mode = input.mode;
          this.signal = input.signal;
          if (!body && input._bodyInit != null) {
            body = input._bodyInit;
            input.bodyUsed = true;
          }
        } else {
          this.url = String(input);
        }
        this.credentials = options.credentials || this.credentials || "same-origin";
        if (options.headers || !this.headers) {
          this.headers = new Headers(options.headers);
        }
        this.method = normalizeMethod(options.method || this.method || "GET");
        this.mode = options.mode || this.mode || null;
        this.signal = options.signal || this.signal || function () {
          if ("AbortController" in g) {
            var ctrl = new AbortController();
            return ctrl.signal;
          }
        }();
        this.referrer = null;
        if ((this.method === "GET" || this.method === "HEAD") && body) {
          throw new TypeError("Body not allowed for GET or HEAD requests");
        }
        this._initBody(body);
        if (this.method === "GET" || this.method === "HEAD") {
          if (options.cache === "no-store" || options.cache === "no-cache") {
            var reParamSearch = /([?&])_=[^&]*/;
            if (reParamSearch.test(this.url)) {
              this.url = this.url.replace(reParamSearch, "$1_=" + new Date().getTime());
            } else {
              var reQueryString = /\?/;
              this.url += (reQueryString.test(this.url) ? "&" : "?") + "_=" + new Date().getTime();
            }
          }
        }
      }
      Request.prototype.clone = function () {
        return new Request(this, { body: this._bodyInit });
      };
      function decode(body) {
        var form = new FormData();
        body.trim().split("&").forEach(function (bytes) {
          if (bytes) {
            var split = bytes.split("=");
            var name = split.shift().replace(/\+/g, " ");
            var value = split.join("=").replace(/\+/g, " ");
            form.append(decodeURIComponent(name), decodeURIComponent(value));
          }
        });
        return form;
      }
      function parseHeaders(rawHeaders) {
        var headers = new Headers();
        var preProcessedHeaders = rawHeaders.replace(/\r?\n[\t ]+/g, " ");
        preProcessedHeaders.split("\r").map(function (header) {
          return header.indexOf(`
`) === 0 ? header.substr(1, header.length) : header;
        }).forEach(function (line) {
          var parts = line.split(":");
          var key = parts.shift().trim();
          if (key) {
            var value = parts.join(":").trim();
            try {
              headers.append(key, value);
            } catch (error) {
              console.warn("Response " + error.message);
            }
          }
        });
        return headers;
      }
      Body.call(Request.prototype);
      function Response(bodyInit, options) {
        if (!(this instanceof Response)) {
          throw new TypeError('Please use the "new" operator, this DOM object constructor cannot be called as a function.');
        }
        if (!options) {
          options = {};
        }
        this.type = "default";
        this.status = options.status === undefined ? 200 : options.status;
        if (this.status < 200 || this.status > 599) {
          throw new RangeError("Failed to construct 'Response': The status provided (0) is outside the range [200, 599].");
        }
        this.ok = this.status >= 200 && this.status < 300;
        this.statusText = options.statusText === undefined ? "" : "" + options.statusText;
        this.headers = new Headers(options.headers);
        this.url = options.url || "";
        this._initBody(bodyInit);
      }
      Body.call(Response.prototype);
      Response.prototype.clone = function () {
        return new Response(this._bodyInit, {
          status: this.status,
          statusText: this.statusText,
          headers: new Headers(this.headers),
          url: this.url
        });
      };
      Response.error = function () {
        var response = new Response(null, { status: 200, statusText: "" });
        response.ok = false;
        response.status = 0;
        response.type = "error";
        return response;
      };
      var redirectStatuses = [301, 302, 303, 307, 308];
      Response.redirect = function (url, status) {
        if (redirectStatuses.indexOf(status) === -1) {
          throw new RangeError("Invalid status code");
        }
        return new Response(null, { status, headers: { location: url } });
      };
      exports2.DOMException = g.DOMException;
      try {
        new exports2.DOMException();
      } catch (err) {
        exports2.DOMException = function (message, name) {
          this.message = message;
          this.name = name;
          var error = Error(message);
          this.stack = error.stack;
        };
        exports2.DOMException.prototype = Object.create(Error.prototype);
        exports2.DOMException.prototype.constructor = exports2.DOMException;
      }
      function fetch(input, init) {
        return new Promise(function (resolve, reject) {
          var request = new Request(input, init);
          if (request.signal && request.signal.aborted) {
            return reject(new exports2.DOMException("Aborted", "AbortError"));
          }
          var xhr = new XMLHttpRequest();
          function abortXhr() {
            xhr.abort();
          }
          xhr.onload = function () {
            var options = {
              statusText: xhr.statusText,
              headers: parseHeaders(xhr.getAllResponseHeaders() || "")
            };
            if (request.url.indexOf("file://") === 0 && (xhr.status < 200 || xhr.status > 599)) {
              options.status = 200;
            } else {
              options.status = xhr.status;
            }
            options.url = "responseURL" in xhr ? xhr.responseURL : options.headers.get("X-Request-URL");
            var body = "response" in xhr ? xhr.response : xhr.responseText;
            setTimeout(function () {
              resolve(new Response(body, options));
            }, 0);
          };
          xhr.onerror = function () {
            setTimeout(function () {
              reject(new TypeError("Network request failed"));
            }, 0);
          };
          xhr.ontimeout = function () {
            setTimeout(function () {
              reject(new TypeError("Network request timed out"));
            }, 0);
          };
          xhr.onabort = function () {
            setTimeout(function () {
              reject(new exports2.DOMException("Aborted", "AbortError"));
            }, 0);
          };
          function fixUrl(url) {
            try {
              return url === "" && g.location.href ? g.location.href : url;
            } catch (e) {
              return url;
            }
          }
          xhr.open(request.method, fixUrl(request.url), true);
          if (request.credentials === "include") {
            xhr.withCredentials = true;
          } else if (request.credentials === "omit") {
            xhr.withCredentials = false;
          }
          if ("responseType" in xhr) {
            if (support.blob) {
              xhr.responseType = "blob";
            } else if (support.arrayBuffer) {
              xhr.responseType = "arraybuffer";
            }
          }
          if (init && typeof init.headers === "object" && !(init.headers instanceof Headers || g.Headers && init.headers instanceof g.Headers)) {
            var names = [];
            Object.getOwnPropertyNames(init.headers).forEach(function (name) {
              names.push(normalizeName(name));
              xhr.setRequestHeader(name, normalizeValue(init.headers[name]));
            });
            request.headers.forEach(function (value, name) {
              if (names.indexOf(name) === -1) {
                xhr.setRequestHeader(name, value);
              }
            });
          } else {
            request.headers.forEach(function (value, name) {
              xhr.setRequestHeader(name, value);
            });
          }
          if (request.signal) {
            request.signal.addEventListener("abort", abortXhr);
            xhr.onreadystatechange = function () {
              if (xhr.readyState === 4) {
                request.signal.removeEventListener("abort", abortXhr);
              }
            };
          }
          xhr.send(typeof request._bodyInit === "undefined" ? null : request._bodyInit);
        });
      }
      fetch.polyfill = true;
      if (!g.fetch) {
        g.fetch = fetch;
        g.Headers = Headers;
        g.Request = Request;
        g.Response = Response;
      }
      exports2.Headers = Headers;
      exports2.Request = Request;
      exports2.Response = Response;
      exports2.fetch = fetch;
      Object.defineProperty(exports2, "__esModule", { value: true });
      return exports2;
    }({});
  })(__globalThis__);
  __globalThis__.fetch.ponyfill = true;
  delete __globalThis__.fetch.polyfill;
  var ctx = __global__.fetch ? __global__ : __globalThis__;
  exports = ctx.fetch;
  exports.default = ctx.fetch;
  exports.fetch = ctx.fetch;
  exports.Headers = ctx.Headers;
  exports.Request = ctx.Request;
  exports.Response = ctx.Response;
  module.exports = exports;
});

// ../common/src/apiClient.ts
var import_cross_fetch = __toESM(require_browser_ponyfill(), 1);
var fetchFn = import_cross_fetch.default;
var sleepFn = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
function configureFetch(fn) {
  fetchFn = fn;
}
function configureSleep(fn) {
  sleepFn = fn;
}
var baseUrl;
var getAccessToken;
function sleep(ms) {
  return sleepFn(ms);
}
async function postWithJob(url, body, options = {}) {
  const intervalMs = options.intervalMs ?? 2000;
  const token = await getAccessToken();
  const response = await fetchFn(url, {
    method: "post",
    contentType: "application/json",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (response.status === 200) {
    options.onProgress?.(options.taskName ? `${options.taskName} complete successfully` : "Request completed successfully");
    return response.json();
  } else if (response.status === 202) {
    const data = await response.json();
    const jobId = data.jobId;
    if (typeof jobId !== "string") {
      throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
    }
    options.onProgress?.(options.taskName ? `${options.taskName} job submitted, polling for completion...` : "Job submitted, polling for completion...");
    let loopCount = 0;
    while (true) {
      loopCount++;
      console.log(`Polling job status: ${jobId} (attempt ${loopCount})`);
      if (loopCount % 2 === 0) {
        options.onProgress?.(options.taskName ? `Waiting for ${options.taskName.toLowerCase()} job to complete...` : "Waiting for job to complete...");
      }
      await sleep(intervalMs);
      const status = await pollJobStatus(jobId);
      if (status.status === "pending") {
        continue;
      } else if (status.status === "completed") {
        if (!status.resultUrl) {
          throw new Error(`Missing resultUrl in job status: ${JSON.stringify(status)}`);
        }
        const resultResp = await fetchFn(status.resultUrl, { contentType: "application/json", method: "get", headers: { "Content-Type": "application/json" } });
        if (!resultResp.ok) {
          const errText = await resultResp.text();
          throw new Error(`${resultResp.statusText}: ${errText}`);
        }
        options.onProgress?.(options.taskName ? `${options.taskName} job completed successfully` : "Job completed successfully");
        return await resultResp.json();
      } else {
        throw new Error(`Job failed with status: ${status.status}`);
      }
    }
  } else {
    const errText = await response.text();
    throw new Error(`${response.statusText}: ${errText}`);
  }
}
function configureClient(opts) {
  baseUrl = opts.baseUrl;
  getAccessToken = opts.getAccessToken;
}
async function analyzeSentiment(inputs, options) {
  const url = `${baseUrl}/pulse/v1/sentiment`;
  const data = await postWithJob(url, { fast: options?.fast, inputs }, { taskName: "Sentiment analysis", onProgress: options?.onProgress });
  if (Array.isArray(data.results)) {
    return { results: data.results };
  }
  throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}
async function generateThemes(inputs, options) {
  console.log("Generating themes for inputs:", inputs);
  const url = `${baseUrl}/pulse/v1/themes`;
  const data = await postWithJob(url, {
    inputs,
    fast: options?.fast ?? false
  }, {
    onProgress: options?.onProgress,
    taskName: "Theme generation"
  });
  console.log("Generated themes:", data);
  if (Array.isArray(data.themes)) {
    return { themes: data.themes };
  }
  throw new Error(`Unexpected response: ${JSON.stringify(data)}`);
}
async function compareSimilarity(setA, setB, options) {
  const url = `${baseUrl}/pulse/v1/similarity`;
  const data = await postWithJob(url, {
    set_a: setA,
    set_b: setB,
    fast: options?.fast ?? false
  }, {
    onProgress: options?.onProgress,
    taskName: "Similarity comparison"
  });
  const result = { matrix: [] };
  if (data.matrix) {
    result.matrix = data.matrix;
  }
  if (data.flattened) {
    const n = setA.length;
    const m = setB.length;
    result.matrix = [];
    for (let i = 0; i < n; i++) {
      result.matrix[i] = data.flattened.slice(i * m, (i + 1) * m);
    }
  }
  return result;
}
async function pollJobStatus(jobId) {
  if (!baseUrl || !getAccessToken) {
    throw new Error("API client not configured. Call configureClient first.");
  }
  const token = await getAccessToken();
  const url = `${baseUrl}/pulse/v1/jobs?jobId=${encodeURIComponent(jobId)}`;
  const response = await fetchFn(url, {
    method: "get",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    }
  });
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  return data;
}
// ../common/src/input.ts
function extractInputs(data, options) {
  const { rowOffset = 0, colOffset = 0 } = options || {};
  const inputs = [];
  const positions = [];
  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < row.length; j++) {
      const cell = row[j];
      if (cell != null && cell !== "") {
        inputs.push(cell.toString());
        positions.push({
          row: i + rowOffset,
          col: j + colOffset
        });
      }
    }
  }
  return { inputs, positions };
}
function sampleInputs(arr, max) {
  if (arr.length <= max) {
    return arr.slice();
  }
  const copy = arr.slice();
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, max);
}
// ../common/src/similarity.ts
function topN(matrix, n, includeSelf = false) {
  return matrix.map((row, i) => {
    const neighbors = row.map((value, index) => ({ index, value })).filter(({ index }) => includeSelf || index !== i).sort((a, b) => b.value - a.value).slice(0, n);
    return neighbors;
  });
}

// ../common/src/themes.ts
var STORAGE_KEY = "themeSets";
var storage;
function configureStorage(s) {
  storage = s;
}
async function getThemeSets() {
  if (!storage)
  throw new Error("Storage not configured");
  const sets = await storage.get(STORAGE_KEY);
  return sets ?? [];
}
async function saveThemeSet(name, themes) {
  if (!storage)
  throw new Error("Storage not configured");
  const sets = await getThemeSets();
  const existing = sets.find((s) => s.name === name);
  if (existing) {
    existing.themes = themes;
  } else {
    sets.push({ name, themes });
  }
  await storage.set(STORAGE_KEY, sets);
}
async function deleteThemeSet(name) {
  if (!storage)
  throw new Error("Storage not configured");
  const sets = await getThemeSets();
  const filtered = sets.filter((s) => s.name !== name);
  if (filtered.length !== sets.length) {
    await storage.set(STORAGE_KEY, filtered);
  }
}
async function renameThemeSet(oldName, newName) {
  if (!storage)
  throw new Error("Storage not configured");
  const sets = await getThemeSets();
  const setObj = sets.find((s) => s.name === oldName);
  if (!setObj)
  throw new Error(`Theme set not found: ${oldName}`);
  if (sets.some((s) => s.name === newName)) {
    throw new Error(`Theme set already exists: ${newName}`);
  }
  setObj.name = newName;
  await storage.set(STORAGE_KEY, sets);
}
async function allocateThemes(inputs, themes, options) {
  const similarityResponse = await compareSimilarity(inputs, themes.map((t) => t.representatives.join(`
`)), options);
  const best = topN(similarityResponse.matrix, 1, true).flat();
  return inputs.map((_, i) => {
    const fit = best[i];
    const theme = themes[fit.index];
    const score = fit.value;
    return {
      theme,
      score
    };
  });
}
// ../common/src/auth.ts
var import_cross_fetch2 = __toESM(require_browser_ponyfill(), 1);
// ../common/src/org.ts
async function findOrganization(url, email) {
  const options = {
    method: "post",
    contentType: "application/json",
    body: JSON.stringify({ email })
  };
  try {
    const response = await fetchFn(url, options);
    const data = await response.json();
    if (data.organizationId) {
      return { success: true, orgId: data.organizationId };
    }
    return { success: false };
  } catch (e) {
    const msg = e && e.toString ? e.toString() : "";
    if (msg.includes("returned code 404")) {
      return { success: false, notFound: true };
    }
    throw new Error("Error finding organization: " + e);
  }
}
// src/config.ts
var SCRIPT_PROPS = PropertiesService.getScriptProperties();
var API_BASE = SCRIPT_PROPS.getProperty("API_BASE") + "/pulse/v1";
var WEB_BASE = SCRIPT_PROPS.getProperty("WEB_BASE");
var AUTH_DOMAIN = SCRIPT_PROPS.getProperty("AUTH_DOMAIN");
var API_AUD = SCRIPT_PROPS.getProperty("API_AUD");
var ORG_LOOKUP_URL = `${WEB_BASE}/users`;

// src/getOAuthService.ts
function getOAuthService() {
  const orgId = PropertiesService.getUserProperties().getProperty("ORG_ID");
  if (!orgId) {
    return {
      hasAccess: () => false
    };
  }
  const orgIdParts = orgId.split("/");
  const auth0OrgId = orgIdParts[orgIdParts.length - 1];
  return OAuth2.createService("ResearchWiseAI").setAuthorizationBaseUrl(`https://${AUTH_DOMAIN}/authorize`).setCache(CacheService.getUserCache()).setLock(LockService.getUserLock()).setTokenUrl(`https://${AUTH_DOMAIN}/oauth/token`).setClientId(SCRIPT_PROPS.getProperty("CLIENT_ID")).setClientSecret(SCRIPT_PROPS.getProperty("CLIENT_SECRET")).setCallbackFunction("authCallback").setPropertyStore(PropertiesService.getUserProperties()).setScope("openid profile email offline_access").setParam("audience", API_AUD).setParam("organization", auth0OrgId).setParam("prompt", "consent").setParam("login_hint", PropertiesService.getUserProperties().getProperty("USER_EMAIL"));
}

// src/auth.ts
function authCallback(request) {
  const service = getOAuthService();
  const authorized = service.handleCallback(request);
  if (authorized) {
    return HtmlService.createHtmlOutput("Success! You may close this dialog.");
  } else {
    return HtmlService.createHtmlOutput("Denied. You may close this dialog.");
  }
}
function getAuthorizationUrl() {
  return getOAuthService().getAuthorizationUrl();
}
function isAuthorized() {
  return getOAuthService().hasAccess();
}
function disconnect() {
  const props = PropertiesService.getUserProperties();
  try {
    getOAuthService().reset();
  } catch {
    console.warn("Error resetting OAuth service");
  }
  props.deleteProperty("USER_EMAIL");
  props.deleteProperty("ORG_ID");
  return { success: true };
}
async function findOrganization2(email) {
  const props = PropertiesService.getUserProperties();
  const result = await findOrganization(ORG_LOOKUP_URL, email);
  if (result.success && result.orgId) {
    props.setProperty("USER_EMAIL", email);
    props.setProperty("ORG_ID", result.orgId);
  }
  return result;
}

// src/showAllocationModeDialog.ts
async function showAllocationModeDialog(dataRange) {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("AllocationModeDialog");
  template.dataRange = dataRange;
  const themeSet = await getThemeSets();
  template.themeSetNames = themeSet.map(function (s) {
    return s.name;
  });
  const html = template.evaluate().setWidth(400).setHeight(200);
  ui.showModelessDialog(html, "Theme Allocation Mode");
}

// src/showInputRangeDialog.ts
function showInputRangeDialog(mode) {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("InputRangeDialog");
  template.dataRange = getActiveRangeA1Notation();
  template.mode = mode;
  const html = template.evaluate().setWidth(400).setHeight(200);
  ui.showModelessDialog(html, "Select Input Range");
}

// src/writeThemes.ts
function writeThemes(themes2) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let outputSheet = ss.getSheetByName("Themes");
  if (!outputSheet) {
    outputSheet = ss.insertSheet("Themes");
  } else {
    outputSheet.clear();
  }
  const headers = [
  "Short Label",
  "Label",
  "Description",
  "Representative 1",
  "Representative 2"];

  outputSheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  const rows = themes2.map((theme) => [
  theme.shortLabel,
  theme.label,
  theme.description,
  theme.representatives[0] || "",
  theme.representatives[1] || ""]
  );
  if (rows.length > 0) {
    outputSheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  }
}

// src/generateThemes.ts
async function generateThemesFlow(dataRange) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Starting theme generation...", "Pulse");
  let dataRangeObj;
  try {
    dataRangeObj = ss.getRange(dataRange);
  } catch (e) {
    ui.alert("Error reading data range: " + e.toString());
    return;
  }
  const values = dataRangeObj.getValues();
  const { inputs, positions } = extractInputs(values, {
    rowOffset: dataRangeObj.getRow(),
    colOffset: dataRangeObj.getColumn()
  });
  console.log("inputs", inputs);
  console.log("positions", positions);
  if (inputs.length === 0) {
    ui.alert("No text found in selected data range for theme allocation.");
    return;
  }
  const total = inputs.length;
  let usedInputs = inputs;
  if (inputs.length > 1000) {
    usedInputs = sampleInputs(inputs, 1000);
    ui.alert("Sampling input: using " + usedInputs.length + " of " + total + " strings (" + Math.round(usedInputs.length / total * 100) + "%) for theme generation.");
  }
  console.log("usedInputs", usedInputs);
  const themesResponse = await generateThemes(usedInputs, {
    fast: false,
    onProgress: (message) => {
      ss.toast(message, "Pulse");
    }
  });
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  saveThemeSet(timestamp, themesResponse.themes);
  await writeThemes(themesResponse.themes);
  ss.toast("Theme generation complete", "Pulse");
  return {
    themes: themesResponse.themes,
    sampledInputs: usedInputs,
    inputs,
    positions,
    dataRangeObj
  };
}
// src/writeAllocationsToSheet.ts
function writeAllocationsToSheet(allocations, sheet, positions) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const themes2 = allocations.map((a) => a.theme);
  positions.forEach((pos, i) => {
    sheet.getRange(pos.row, pos.col + 1).setValue(themes2[i].label);
  });
  ss.toast("Theme allocation complete", "Pulse");
}

// src/allocateThemesFromSet.ts
async function allocateThemesFromSet(dataRange, name) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dataRangeObj;
  try {
    dataRangeObj = ss.getRange(dataRange);
  } catch (e) {
    ui.alert("Error reading data range: " + e.toString());
    return;
  }
  const values = dataRangeObj.getValues();
  const { inputs, positions } = extractInputs(values, {
    rowOffset: dataRangeObj.getRow(),
    colOffset: dataRangeObj.getColumn()
  });
  const themeSet = await getThemeSets();
  const setObj = themeSet.find(function (s) {
    return s.name === name;
  });
  if (!setObj) {
    ui.alert("Theme set not found: " + name);
    return;
  }
  const themes2 = setObj.themes;
  const dataSheet = dataRangeObj.getSheet();
  writeAllocationsToSheet(await allocateThemes(inputs, themes2, {
    fast: false,
    onProgress: (message) => {
      ss.toast(message, "Pulse");
    }
  }), dataSheet, positions);
}
// src/allocateAndSaveThemeSet.ts
async function allocateAndSaveThemeSet(ranges) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let dataRangeObj;
  try {
    dataRangeObj = ss.getRange(ranges.dataRange);
  } catch (e) {
    ui.alert("Error reading data range: " + e.toString());
    return;
  }
  const dataSheet = dataRangeObj.getSheet();
  const values = dataRangeObj.getValues();
  const { inputs, positions } = extractInputs(values, {
    rowOffset: dataRangeObj.getRow(),
    colOffset: dataRangeObj.getColumn()
  });
  if (inputs.length === 0) {
    ui.alert("No text found in selected data range for theme allocation.");
    return;
  }
  let labels, rep1, rep2;
  try {
    labels = ss.getRange(ranges.labels).getValues().flat();
    rep1 = ss.getRange(ranges.rep1).getValues().flat();
    rep2 = ss.getRange(ranges.rep2).getValues().flat();
  } catch (e) {
    ui.alert("Error reading custom ranges: " + e.toString());
    return;
  }
  if (labels.length !== rep1.length || labels.length !== rep2.length) {
    ui.alert("Selected ranges must have the same number of cells");
    return;
  }
  const themes2 = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    const ex1 = rep1[i];
    const ex2 = rep2[i];
    if (label != null && label !== "" && ex1 != null && ex1 !== "" && ex2 != null && ex2 !== "") {
      themes2.push({
        label: label.toString(),
        representatives: [ex1.toString(), ex2.toString()]
      });
    }
  }
  if (themes2.length === 0) {
    ui.alert("No themes provided for allocation.");
    return;
  }
  writeAllocationsToSheet(await allocateThemes(inputs, themes2, {
    fast: false,
    onProgress: (message) => {
      ss.toast(message, "Pulse");
    }
  }), dataSheet, positions);
}
// src/allocateThemesAutomatic.ts
async function allocateThemesAutomatic(dataRange) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const {
    inputs: usedInputs,
    positions,
    dataRangeObj,
    themes: themes2
  } = await generateThemesFlow(dataRange);
  ss.toast("Theme generation complete. Starting allocation work", "Pulse");
  const dataSheet = dataRangeObj.getSheet();
  writeAllocationsToSheet(await allocateThemes(usedInputs, themes2, {
    fast: false,
    onProgress: (message) => {
      ss.toast(message, "Pulse");
    }
  }), dataSheet, positions);
}
// src/analyzeSentiment.ts
async function analyzeSentimentFlow(dataRange) {
  const ui = SpreadsheetApp.getUi();
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ss.toast("Starting sentiment analysis...", "Pulse");
  const parts = dataRange.split("!");
  const sheetName = parts[0];
  const rangeNotation = parts.slice(1).join("!");
  const dataSheet = ss.getSheetByName(sheetName);
  if (!dataSheet) {
    ui.alert(`Sheet "${sheetName}" not found.`);
    return;
  }
  let dataRangeObj;
  try {
    dataRangeObj = dataSheet.getRange(rangeNotation);
  } catch (e) {
    ui.alert(`Invalid range notation "${rangeNotation}".`);
    return;
  }
  const values = dataRangeObj.getValues();
  const { inputs, positions } = extractInputs(values, {
    rowOffset: dataRangeObj.getRow(),
    colOffset: dataRangeObj.getColumn()
  });
  if (inputs.length === 0) {
    ui.alert("No text found in selected data range for sentiment analysis.");
    return;
  }
  const data = await analyzeSentiment(inputs, {
    fast: false,
    onProgress: (message) => {
      ss.toast(message, "Pulse");
    }
  });
  function writeResults(results) {
    results.forEach((res, idx) => {
      const pos = positions[idx];
      const sentiment = res.sentiment;
      dataSheet.getRange(pos.row, pos.col + 1).setValue(sentiment);
    });
  }
  writeResults(data.results);
  ss.toast("Sentiment analysis complete", "Pulse");
}
// src/updateMenu.ts
function updateMenu() {
  const ui = SpreadsheetApp.getUi();
  const pulseMenu = ui.createMenu("Pulse");
  if (getOAuthService().hasAccess()) {
    pulseMenu.addItem("Analyze Sentiment", "analyzeSentiment");
    const themesMenu = ui.createMenu("Themes").addItem("Generate", "generateThemes").addItem("Allocate", "allocateThemes").addItem("Manage", "showManageThemesDialog");
    pulseMenu.addSubMenu(themesMenu);
    pulseMenu.addSeparator();
  }
  pulseMenu.addItem("Settings", "showSettingsSidebar");
  pulseMenu.addToUi();
}

// src/Code.ts
var mapStatusToStatusText = {
  200: "OK",
  201: "Created",
  202: "Accepted",
  204: "No Content",
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  429: "Too Many Requests",
  500: "Internal Server Error",
  502: "Bad Gateway",
  503: "Service Unavailable",
  504: "Gateway Timeout"
};
configureClient({
  baseUrl: "https://core.researchwiseai.com",
  getAccessToken: async () => getOAuthService().getAccessToken()
});
configureSleep(async (ms) => Utilities.sleep(ms));
configureStorage({
  delete: async (key) => {
    const props = PropertiesService.getUserProperties();
    props.deleteProperty(key);
  },
  get: async (key) => {
    const props = PropertiesService.getUserProperties();
    const value = props.getProperty(key);
    if (value) {
      return JSON.parse(value);
    }
    return null;
  },
  set: async (key, value) => {
    const props = PropertiesService.getUserProperties();
    props.setProperty(key, JSON.stringify(value));
  }
});
configureFetch(async (url, options) => {
  console.log("Fetching URL:", url);
  console.log("Options:", options);
  const response = await UrlFetchApp.fetch(url, {
    payload: options.body,
    method: options.method,
    contentType: options.contentType,
    headers: {
      ...options.headers,
      ...(options.contentType ? { "Content-Type": options.contentType } : {})
    },
    muteHttpExceptions: true
  });
  console.log("Response:", response.getResponseCode());
  return {
    ok: response.getResponseCode() === 200,
    status: response.getResponseCode(),
    statusText: mapStatusToStatusText[response.getResponseCode()] || `Unknown Status: ${response.getResponseCode()}`,
    text: async () => response.getContentText(),
    json: async () => {
      const content = response.getContentText();
      try {
        return JSON.parse(content);
      } catch (e) {
        throw new Error(`Failed to parse JSON response: ${content}`);
      }
    }
  };
});
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  const pulseMenu = ui.createMenu("Pulse");
  if (getOAuthService().hasAccess()) {
    pulseMenu.addItem("Analyze Sentiment", "clickAnalyzeSentiment");
    const themesMenu = ui.createMenu("Themes").addItem("Generate", "clickGenerateThemes").addItem("Allocate", "clickAllocateThemes").addItem("Manage", "showManageThemesDialog");
    pulseMenu.addSubMenu(themesMenu);
    pulseMenu.addSeparator();
  }
  pulseMenu.addItem("Settings", "showSettingsSidebar");
  pulseMenu.addToUi();
}
function clickGenerateThemes() {
  showInputRangeDialog("generation");
}
function clickAllocateThemes() {
  showInputRangeDialog("allocation");
}
function clickAnalyzeSentiment() {
  showInputRangeDialog("sentiment");
}
function debounceByArgs(fn, waitMs) {
  const lastCalled = new Map();
  return (...args) => {
    const key = JSON.stringify(args);
    const now = Date.now();
    const prev = lastCalled.get(key) ?? 0;
    if (now - prev >= waitMs) {
      lastCalled.set(key, now);
      return fn(...args);
    }
  };
}
function themeGenerationRouting(dataRange, mode) {
  console.log("submitSelectedInputRangeForGeneration", dataRange, mode);
  if (mode === "generation") {
    generateThemesFlow(dataRange);
  } else {
    allocateThemesWithRange(dataRange);
  }
}
var debouncedThemeGenerationRouting = debounceByArgs(themeGenerationRouting, 20000);
function submitSelectedInputRangeForGeneration(dataRange, mode) {
  return debouncedThemeGenerationRouting(dataRange, mode);
}
function allocateThemesWithRange(dataRange) {
  showAllocationModeDialog(dataRange);
}
async function saveManualThemeSet(data) {
  const themes2 = data.themes.map(function (th) {
    return {
      label: th.label,
      representatives: [th.rep1 || "", th.rep2 || ""]
    };
  });
  try {
    await saveThemeSet(data.name, themes2);
    return { success: true };
  } catch (e) {
    Logger.log("Error saving theme set: " + e);
    return { success: false };
  }
}
function onInstall() {
  onOpen();
}
function showSettingsSidebar() {
  const template = HtmlService.createTemplateFromFile("Settings");
  template.webBase = WEB_BASE;
  const html = template.evaluate().setTitle("Pulse");
  SpreadsheetApp.getUi().showSidebar(html);
}
function getSettings() {
  const props = PropertiesService.getUserProperties();
  return {
    email: props.getProperty("USER_EMAIL") || "",
    isAuthorized: isAuthorized()
  };
}
function showRangeDialog(dataRange, name) {
  const template = HtmlService.createTemplateFromFile("RangeDialog");
  template.dataRange = dataRange;
  template.name = name;
  const html = template.evaluate().setWidth(400).setHeight(350);
  SpreadsheetApp.getUi().showModelessDialog(html, "Custom Theme Ranges");
}
async function showManageThemesDialog() {
  const ui = SpreadsheetApp.getUi();
  const template = HtmlService.createTemplateFromFile("ManageThemes");
  template.themeSets = await getThemeSets();
  const html = template.evaluate().setWidth(500).setHeight(500);
  ui.showModelessDialog(html, "Manage Theme Sets");
}
function getActiveRangeA1Notation() {
  const range = SpreadsheetApp.getActiveRange();
  const sheet = range.getSheet();
  return `${sheet.getName()}!${range.getA1Notation()}`;
}