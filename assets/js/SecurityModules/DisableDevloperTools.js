function DisableDevloperTools(){

    document.onkeydown = (event)=>{
        // disable ctrl + shift + c
        if(event.ctrlKey && event.shiftKey && event.key == 'C')
        {
            return false
        }
        
        
        // disable F12
        if(event.keyCode == '123')
        {
            return false
        }
    }
    // right click disable
    document.oncontextmenu = ()=>{
        return false;
    }
}

export {DisableDevloperTools}