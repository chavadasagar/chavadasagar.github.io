import { GenrateGUID } from "./modules/getguid.js";

document.querySelector(".genrate").addEventListener("click", function () {
    document.querySelector(".result").innerText = GenrateGUID();
})