import { isUrlValid } from "./validation/validation.js";





// get parameter type value

// show select parameter box
document.getElementById("customparameterbox").style.display = "none";
document.getElementById("jsonstringbox").style.display = "none";
// end show select parameter box

document.querySelector("#jsonstr").addEventListener("click", function () {

    document.getElementById("jsonstringbox").style.display = "block";
    document.getElementById("customparameterbox").style.display = "none";

});
document.querySelector("#param").addEventListener("click", function () {
    document.getElementById("jsonstringbox").style.display = "none";
    document.getElementById("customparameterbox").style.display = "block";
});


// if click add parameter btn

function removeparam(e) {
    debugger
    e.target.parentElement.parentElement.remove();

}


function addparam() {

    debugger
    document.querySelector(".parambox").innerHTML +=

        `<div class="row col-m12">
    <div class="form-group col">
        <label for="" class="form-label">Key</label>
        <input type="text" class="form-control" />
      </div>

      <div class="form-group col">
        <label for="" class="form-label">Value</label>
        <input type="text" class="form-control" />
      </div>

      <div class="col align-items-center d-flex">
        <button class="btn btn-danger btn-sm mt-4" onclick='removeparam(event)'>
          -
        </button>
      </div>
    </div>`;
}


document.querySelector("#postmanform").addEventListener("submit", function (e) {
    e.preventDefault();


    debugger
    let url = document.querySelector("[name=url]").value;
    if (url != "") {
        if (isUrlValid(url)) {
            let requesttype = document.querySelector("[name=requesttype]:checked").value;
            let contenttype = document.querySelector("[name=parametertype]:checked").value;
            if (requesttype == "post") {
                let jsonstring = document.getElementById("jsonstring").value;
                fetch(url, {
                    method: "POST",
                    body: jsonstring,
                    headers: {
                        'Content-type': 'application/json; charset=UTF-8'
                    }
                })
                    .then(response => response.text())
                    .then(text => {
                        document.getElementById("responsetext").innerText = text;
                    });
            }
            else if (requesttype == "get") {
                fetch(url, {
                    method: 'GET'
                })
                    .then(response => response.text())
                    .then(response => {
                        document.getElementById("responsetext").innerText = response;
                    })
            }
            else {
                console.log("Something Went Wrong");
            }
        } else {
            Swal.fire("Please Enter Valid Url","","error");

        }
    }
    else {
        Swal.fire("Please Enter Url", "", "error");
    }


});