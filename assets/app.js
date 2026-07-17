/* Vibe Coding 工作坊 — 共用互動
   零依賴。四件事：OS 切換、複製鈕、自檢清單進度、目錄捲動高亮。 */

(function () {
  'use strict';

  var LS = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* 無痕模式會擋，忽略 */ } }
  };

  /* ---------- OS 切換 ----------
     標記方式是明確的 class（.os-only.mac / .os-line.win），不去猜程式碼註解的內容。 */

  function detectOS() {
    var p = (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform || '';
    return /mac/i.test(p) ? 'mac' : 'win';
  }

  function applyOS(os) {
    document.body.classList.remove('os-mac', 'os-win');
    document.body.classList.add('os-' + os);
    document.querySelectorAll('.os-btn').forEach(function (btn) {
      btn.setAttribute('aria-pressed', String(btn.dataset.os === os));
    });
  }

  function initOS() {
    var os = LS.get('vc-os') || detectOS();
    applyOS(os);
    document.querySelectorAll('.os-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        LS.set('vc-os', btn.dataset.os);
        applyOS(btn.dataset.os);
      });
    });
  }

  /* ---------- 複製鈕 ---------- */

  function initCopy() {
    document.querySelectorAll('pre').forEach(function (pre) {
      if (pre.dataset.nocopy !== undefined) return;

      if (pre.classList.contains('prompt')) {
        // 1. 建立 wrapper
        var wrapper = document.createElement('div');
        wrapper.className = 'prompt-wrapper';

        // 2. 建立 header
        var header = document.createElement('div');
        header.className = 'prompt-header';

        // 3. 建立標題
        var title = document.createElement('span');
        title.className = 'prompt-title';
        title.innerHTML = '💡 Claude 提示詞';

        // 4. 建立複製按鈕
        var btn = document.createElement('button');
        btn.className = 'prompt-copy-btn';
        btn.type = 'button';
        btn.innerHTML = '📋 複製提示詞';
        btn.setAttribute('aria-label', '複製這段提示詞');

        btn.addEventListener('click', function () {
          var code = pre.querySelector('code') || pre;
          var textToCopy = code.innerText.trim();

          function showSuccess() {
            btn.innerHTML = '✅ 已複製！';
            btn.classList.add('copied');
            setTimeout(function () {
              btn.innerHTML = '📋 複製提示詞';
              btn.classList.remove('copied');
            }, 1800);
          }

          function showError() {
            btn.innerHTML = '❌ 複製失敗';
            setTimeout(function () { btn.innerHTML = '📋 複製提示詞'; }, 1800);
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(showError);
          } else {
            // Fallback for non-secure contexts
            try {
              var textArea = document.createElement('textarea');
              textArea.value = textToCopy;
              textArea.style.top = '0';
              textArea.style.left = '0';
              textArea.style.position = 'fixed';
              textArea.style.opacity = '0';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              var successful = document.execCommand('copy');
              document.body.removeChild(textArea);
              if (successful) showSuccess();
              else showError();
            } catch (err) {
              showError();
            }
          }
        });

        header.appendChild(title);
        header.appendChild(btn);

        // 將 wrapper 插入到 pre 的位置，並把 pre 放進 wrapper
        pre.parentNode.insertBefore(wrapper, pre);
        wrapper.appendChild(header);
        wrapper.appendChild(pre);
      } else {
        var btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.type = 'button';
        btn.textContent = '複製';
        btn.setAttribute('aria-label', '複製這段內容');

        btn.addEventListener('click', function () {
          // 只複製目前 OS 看得到的行，免得 mac 的人複製到 Windows 指令
          var code = pre.querySelector('code') || pre;
          var lines = code.querySelectorAll('.os-line');
          var text;
          if (lines.length) {
            text = Array.prototype.filter.call(lines, function (el) {
              return el.offsetParent !== null;
            }).map(function (el) { return el.textContent; }).join('\n');
          } else {
            text = code.innerText;
          }

          var textToCopy = text.trim();

          function showSuccess() {
            btn.textContent = '已複製！';
            btn.classList.add('copied');
            setTimeout(function () {
              btn.textContent = '複製';
              btn.classList.remove('copied');
            }, 1800);
          }

          function showError() {
            btn.textContent = '複製失敗';
            setTimeout(function () { btn.textContent = '複製'; }, 1800);
          }

          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textToCopy).then(showSuccess).catch(showError);
          } else {
            // Fallback for non-secure contexts (e.g., HTTP via local network IP)
            try {
              var textArea = document.createElement('textarea');
              textArea.value = textToCopy;
              // Prevent scrolling on mobile/safari
              textArea.style.top = '0';
              textArea.style.left = '0';
              textArea.style.position = 'fixed';
              textArea.style.opacity = '0';
              document.body.appendChild(textArea);
              textArea.focus();
              textArea.select();
              var successful = document.execCommand('copy');
              document.body.removeChild(textArea);
              if (successful) {
                showSuccess();
              } else {
                showError();
              }
            } catch (err) {
              showError();
            }
          }
        });

        pre.appendChild(btn);
      }
    });
  }

  /* ---------- 自檢清單 ----------
     key 用 data-ck 的穩定字串，不用陣列索引 — 講義改順序時進度才不會錯位。 */

  function initChecks() {
    var boxes = document.querySelectorAll('input[type="checkbox"][data-ck]');
    if (!boxes.length) return;

    boxes.forEach(function (box) {
      var key = 'vc-ck-' + box.dataset.ck;
      if (LS.get(key) === '1') box.checked = true;
      box.addEventListener('change', function () {
        LS.set(key, box.checked ? '1' : '0');
        updateProgress();
      });
    });

    updateProgress();
  }

  function updateProgress() {
    document.querySelectorAll('[data-check-group]').forEach(function (group) {
      var boxes = group.querySelectorAll('input[type="checkbox"][data-ck]');
      var done = group.querySelectorAll('input[type="checkbox"][data-ck]:checked').length;
      var out = document.querySelector('[data-check-progress="' + group.dataset.checkGroup + '"]');
      if (!out || !boxes.length) return;
      out.textContent = done === boxes.length
        ? '✅ ' + boxes.length + ' 項全部完成'
        : done + ' / ' + boxes.length + ' 項完成';
    });
  }

  /* ---------- 目錄捲動高亮 ---------- */

  function initTOC() {
    var links = document.querySelectorAll('.toc a[href^="#"]');
    if (!links.length) return;

    var targets = [];
    links.forEach(function (a) {
      var el = document.getElementById(decodeURIComponent(a.getAttribute('href').slice(1)));
      if (el) targets.push({ el: el, link: a });
    });
    if (!targets.length) return;

    function sync() {
      var y = window.scrollY + 100;
      var current = targets[0];
      targets.forEach(function (t) { if (t.el.offsetTop <= y) current = t; });
      links.forEach(function (a) { a.classList.toggle('active', a === current.link); });
    }

    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () { sync(); ticking = false; });
    }, { passive: true });

    sync();
  }

  function init() {
    initOS();
    initCopy();
    initChecks();
    initTOC();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
