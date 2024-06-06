function solution(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    for (let j = 0; j < arr.length; j++) {
      if (i != j) {
        const sum = arr[i] + arr[j];
        if (sum == target) {
          return [i, j];
        }
      }
    }
  }
}
const result = solution([2, 4, 5, 6, 8], 10);

// console.log(result);

function solution2(nums, target) {
  const map = new Map();
  for(let i=0;i<nums.length;i++) {
    const complement = target - nums[i]
    if(map.has(complement)) {
        return [map.get(complement), i]
    }
    map.set(nums[i],i)
  }
  return null
}

const result2 = solution2([2, 4, 5, 6, 8], 10)
console.log(result2)