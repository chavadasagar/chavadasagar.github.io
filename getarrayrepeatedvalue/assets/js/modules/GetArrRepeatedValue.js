export function GetArrRepeatedValue(arr) {
    let count = {};
    for (var ele of arr) {
        if (count[ele]) {
            count[ele] += 1;
        } else {
            count[ele] = 1;
        }
    }
    return count;
}
