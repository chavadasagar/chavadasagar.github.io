import { GetArrRepeatedValue } from "./modules/GetArrRepeatedValue.js";
import { GetSeqWiseCountVal } from "./modules/GetSeqWiseCountVal.js";


if (document.getElementById("check") != null) {
    document.getElementById("check").addEventListener("click", function () {
        let UserString = document.getElementById("UserString").value;
        let outpot = document.querySelector(".output");
        debugger
        if (UserString !== "") {
            let tempArr = UserString.split("");
            // outpot.innerText = JSON.stringify(GetArrRepeatedValue(tempArr));
            outpot.innerHTML += `
         <table bordre=1>
         `;
            let outputdata = "<table border='1'>";
            outputdata += "<tr><th>Value</th><th>Count</th></tr>";
            Object.entries(GetArrRepeatedValue(tempArr)).forEach(val => {
                outputdata += `<tr>
             <td>${val[0]}</td>
             <td>${val[1]}</td>
             </tr>`;
            });
            outputdata += `</table>`;
            outpot.innerHTML = outputdata;
        }
        else {
            alert("Please Enter Value");
        }
    });
}

if (document.getElementById("sq_check_btn") != null) {
    document.getElementById("sq_check_btn").addEventListener("click", function () {
        let UserString = document.getElementById("UserString").value;
        let outpot = document.querySelector(".output");
        if (UserString !== "") {
            // outpot.innerText = JSON.stringify(GetArrRepeatedValue(tempArr));
            outpot.innerHTML += `
        <table bordre=1>
        `;
            let outputdata = "<table border='1'>";
            outputdata += "<tr><th>Value</th><th>Count</th></tr>";
            GetSeqWiseCountVal(UserString).forEach(val => {
                debugger
                outputdata +=
                    `<tr>
                <td>${val[0]}</td>
                <td>${val[1]}</td>
            </tr>`;
            });
            outputdata += `</table>`;
            outpot.innerHTML = outputdata;
        }
        else {
            alert("Please Enter Value");
        }
    });
}