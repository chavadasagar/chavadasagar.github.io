document.getElementById("login").addEventListener("click",check)

function check(){
    let username = document.getElementById("username").value;
    let password = document.getElementById("password").value;
    let name = document.getElementById("name").value;
    let user_w = document.getElementById("username_w");
    let pas_w = document.getElementById("password_w");
    let name_w = document.getElementById("name_w");

    if(name.length == "")
    {
        name_w.innerHTML = "** please enter name";
        name_w.style.color = "red";   
             
    }
    else if(username.length == "")
    {
        user_w.innerHTML = "*** please enter sum value";
        user_w.style.color = "red";
        return false;
    }
    else if(password.length == "")
    {
        pas_w.innerHTML = "*** please enter sum value";
        pas_w.style.color = "red";
        return false;
    }  
    else
    {

    }
};
