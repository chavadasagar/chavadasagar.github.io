import { AddUser } from "./adduser.js"
import { User } from "../../models/user.js"
import { generateUniqueNumber } from "../../modules/genratenumber.js"
import { getAllUser } from "./alluser.js"


if (document.getElementById("signupbtn") != undefined) {
    document.getElementById("signupbtn").addEventListener("click", function (event) {
        let user = User
        user.id = generateUniqueNumber(10)
        user.name = document.getElementById("name").value
        user.email = document.getElementById("email").value
        user.password = btoa(document.getElementById("password").value)
        user.createddate = new Date();

        AddUser(user);
        document.getElementById("reset").click();
        location.href = "index.html";
    })
}

if (document.getElementById("loginbtn") != undefined) {
    document.getElementById("loginbtn").addEventListener("click", function () {
        let email = document.getElementById("email").value;
        let password = document.getElementById("password").value;
        let user = getAllUser().filter(val => val.email == email && val.password == btoa(password));
        if(user.length == 0)
        {
            document.getElementById("errormsg").style.color = "red";
            document.querySelector(".error").innerText = "Incorrect username or password";
        }
        else{
            document.getElementById("errormsg").style.color = "green";
            document.getElementById("errormsg").innerText = "Please wait ...";
            setTimeout(() => {
                
            }, 3000);
        }
    });
}