import { inWords } from "./modules/numtoword.js"


document.getElementById("convert").addEventListener("click", () => {
    let number = document.getElementById("number").value;
    if (number == "" || number == undefined || number == null) { 
        Swal.fire("Please Enter Number");
    }
    else {
        if (inWords(Number(number)) == undefined) {
            Swal.fire("Enter Number Only", "", "error");
        }
        else {
            document.getElementById("result").innerHTML = "Result :";
            document.getElementById("result").innerHTML += " " + inWords(Number(number));
        }    
    }
    
});