function showimg(e){
    let file = e.currentTarget.files[0];

    var fr = new FileReader();

    fr.readAsDataURL(file);

    fr.onload = ()=>{
        image.src = fr.result;    
    }
    
    

}