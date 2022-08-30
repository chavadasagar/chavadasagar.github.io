function calculate_age(dob) { 
    var diff_ms = Date.now() - dob.getTime();
    var age_dt = new Date(diff_ms); 
  
    return Math.abs(age_dt.getUTCFullYear() - 1970);
}

$(document).ready(function () {
    $(".check").on("click",function(){
        let dob = new Date($(".dob").val());
        let age = calculate_age(dob);
        $(".age").text(`Your Are ${age} Year Old`);
        $(".dob_modal").modal("show");        
    });
});