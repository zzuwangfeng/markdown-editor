# 代码块使用指南

## 1. 基本代码块

```javascript
function hello() {
  console.log('Hello, World!');
}
hello();
```

## 2. 指定语言

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

```typescript
interface User {
  id: number;
  name: string;
  email: string;
}

const user: User = {
  id: 1,
  name: 'John',
  email: 'john@example.com'
};
```

## 3. 多行代码示例

```go
package main

import "fmt"

func main() {
    fmt.Println("Hello, Go!")
    
    // 循环示例
    for i := 0; i < 5; i++ {
        fmt.Printf("Count: %d\n", i)
    }
}
```

## 4. 包含特殊字符的代码块

```bash
# 这是一个包含反引号的命令
echo `date`

# 多行命令示例
cd /path/to/directory && \
  git status && \
  git add . && \
  git commit -m "Update"
```

## 5. 带行号的代码块

```java
public class Main {
    public static void main(String[] args) {
        // 输出 Hello World
        System.out.println("Hello, World!");
        
        // 简单计算
        int sum = 0;
        for (int i = 1; i <= 100; i++) {
            sum += i;
        }
        System.out.println("Sum: " + sum);
    }
}
```

## 6. 嵌套代码块示例

```javascript
// 代码块内包含反引号
const code = `\`\`\`javascript
function test() {
    console.log('test');
}
\`\`\``;

console.log(code);
```

## 7. 空代码块

```

```

## 8. 复杂示例

```sql
-- 创建用户表
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 查询活跃用户
SELECT 
    u.id,
    u.username,
    COUNT(p.id) as post_count
FROM users u
LEFT JOIN posts p ON u.id = p.user_id
WHERE u.active = TRUE
GROUP BY u.id
HAVING COUNT(p.id) > 5
ORDER BY post_count DESC
LIMIT 10;
```

---

> **提示**: 使用 \`\`\` （三个反引号）包裹代码块，支持指定编程语言以获得语法高亮。
