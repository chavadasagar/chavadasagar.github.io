//  $('.numberonly').keypress(function (e) {
//         var charCode = (e.which) ? e.which : event.keyCode

//         if (String.fromCharCode(charCode).match(/[^0-9]/g) || e.currentTarget.value.length > 9) {
//             return false;
//         }
//  });


document.querySelector(".numberonly").addEventListener("keypress", function (e) {
    debugger
    var charCode = (e.which) ? e.which : event.keyCode;
    if (String.fromCharCode(charCode).match(/[^0-9]/g) || e.currentTarget.value.length > 9) {
        // if (e.currentTarget.value.length == 0)
        // {
        //     e.currentTarget.value="";
        // }
        // else {
        //     if (e.currentTarget.value.length == 1)
        //     {
        //         e.currentTarget.value="";
        //     }
        //     else {
        //         var result = e.currentTarget.value.slice(0, e.currentTarget.value.length - 1)
        //         e.currentTarget.value = result;
        //     }
        // }
        e.currentTarget.value=e.currentTarget.value
        return false;
    }
});