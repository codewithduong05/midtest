<!-- Giải Thích yêu cầu bài toán -->
+ Tìm ra số lớn nhất phần tử lớn hơn n
+ Nhưng không tính giá trị trùng nhau
+ Không có giá trị nào thoả mãn trả về -1
+ Mảng số nguyên đầu vào : 0 <= a.length <= 1000
+ Số tự nhiên n : 0 <= n <= 1000

<!-- Cách Làm  độ phức tạp O(N)  -->
1. Loại bỏ số trùng 
 - Dùng new Set(a) -> [có trích dẫn cách dùng](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set#remove_duplicate_elements_from_an_array)
 
2. Tạo Giá Trị Và Xắp Xếp
 - unique.sort((x, y) => y - x)

3. Check điều kiện không có giá trị 
 - unique[n - 1]
 - note : n lớn hơn số lượng phần tử khác nhau, trả về -1

<!--  -->
