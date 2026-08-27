
console.time("time ");

function searchElement(a, n) {
    const unique = [...new Set(a)];
    unique.sort((x, y) => y - x);

    
    return n >= 1 && n <= unique.length ? unique[n - 1] : -1;
}

console.log(searchElement([6, 5, 4, 3, 2, 1], 1));
// 6
console.timeEnd("time ");
// time : 5.698ms

console.log(searchElement([100, 100, 99, 98, 102, 103], 4));
// 99
console.timeEnd("time ");
// time : 8.983ms


console.log(searchElement([1, 2, 3, 4, 5], 10));
// -1
console.timeEnd("time ");
// time : 5.943ms