// Core Logic Functions
function GetArrRepeatedValue(arr) {
  let count = {};
  for (var ele of arr) {
    if (count[ele]) {
      count[ele] += 1;
    } else {
      count[ele] = 1;
    }
  }
  return count;
}

function GetSeqWiseCountVal(str) {
  let Result = [];
  let count = 0;
  let x;
  for (x = 0; x < str.length; x++) {
    if (str[x] === str[x + 1]) {
      count++;
    } else {
      if (count === 0) {
        Result.push([str[x], count + 1]);
      } else {
        Result.push([str[x - 1], count + 1]);
      }
      count = 0;
    }
  }
  return Result;
}

// UI Helpers
function showToast(msg) {
  let toast = document.getElementById("toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "toast";
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.innerText = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2500);
}

// Event Listeners on DOM Content Loaded
document.addEventListener("DOMContentLoaded", function () {
  // Quick samples handler
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("chip")) {
      const val = e.target.getAttribute("data-val");
      const textarea = document.getElementById("UserString");
      if (textarea) {
        textarea.value = val;
      }
    }
  });

  // Mode 1: Frequency Count (index.html)
  const checkBtn = document.getElementById("check");
  if (checkBtn) {
    const clearBtn = document.getElementById("clear_btn");

    checkBtn.addEventListener("click", function () {
      const userString = document.getElementById("UserString").value;
      const outputContainer = document.querySelector(".output");

      if (userString.trim() !== "") {
        const tempArr = userString.split("");
        const resultObj = GetArrRepeatedValue(tempArr);
        const entries = Object.entries(resultObj);

        let outputHTML = `
          <div class="output-header">
            <h2>Frequency Results</h2>
            <span class="stats-badge">${entries.length} Unique Items</span>
          </div>
          <div class="table-responsive">
            <table class="result-table">
              <thead>
                <tr>
                  <th>Character / Item</th>
                  <th>Frequency Count</th>
                </tr>
              </thead>
              <tbody>
        `;

        entries.forEach(([char, count]) => {
          const displayChar = char === " " ? "(space)" : char;
          outputHTML += `
            <tr>
              <td><span class="val-badge">${displayChar}</span></td>
              <td><span class="count-badge">${count}</span></td>
            </tr>
          `;
        });

        outputHTML += `
              </tbody>
            </table>
          </div>
        `;

        outputContainer.innerHTML = outputHTML;
      } else {
        showToast("Please enter some text or characters to analyze");
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        document.getElementById("UserString").value = "";
        document.querySelector(".output").innerHTML = `
          <div class="empty-state">
            Enter text above and press "Count Repeated Values" to view results.
          </div>
        `;
      });
    }
  }

  // Mode 2: Sequential Consecutive Count (GetSeqWiseCountVal.html)
  const sqBtn = document.getElementById("sq_check_btn");
  if (sqBtn) {
    const clearBtn = document.getElementById("clear_btn");

    sqBtn.addEventListener("click", function () {
      const userString = document.getElementById("UserString").value;
      const outputContainer = document.querySelector(".output");

      if (userString.trim() !== "") {
        const resultArr = GetSeqWiseCountVal(userString);

        let outputHTML = `
          <div class="output-header">
            <h2>Sequence Results</h2>
            <span class="stats-badge">${resultArr.length} Sequences</span>
          </div>
          <div class="table-responsive">
            <table class="result-table">
              <thead>
                <tr>
                  <th>Character / Item</th>
                  <th>Consecutive Run</th>
                </tr>
              </thead>
              <tbody>
        `;

        resultArr.forEach(([char, count]) => {
          const displayChar = char === " " ? "(space)" : char;
          outputHTML += `
            <tr>
              <td><span class="val-badge">${displayChar}</span></td>
              <td><span class="count-badge">${count}</span></td>
            </tr>
          `;
        });

        outputHTML += `
              </tbody>
            </table>
          </div>
        `;

        outputContainer.innerHTML = outputHTML;
      } else {
        showToast("Please enter some text or characters to analyze");
      }
    });

    if (clearBtn) {
      clearBtn.addEventListener("click", function () {
        document.getElementById("UserString").value = "";
        document.querySelector(".output").innerHTML = `
          <div class="empty-state">
            Enter text above and press "Count Sequence Values" to view results.
          </div>
        `;
      });
    }
  }
});