export function GetSeqWiseCountVal(str) {
    let Result = []
    let count = 0
    let x;
     for (x = 0; x < str.length; x++) {

        if (str[x] == str[x + 1]) {
            count++;
        } else {
            if(count==0)
            {Result.push([str[x],count+1]);}
            else
            {
            Result.push([str[x - 1], count + 1]);
            }
            count = 0;
            
        }
    }
    return Result;
}