import pymysql
import random
from datetime import datetime, timedelta

# ---------------------------------------
# DB 연결
# ---------------------------------------
conn = pymysql.connect(
    host="155.230.241.241",
    user="team3_nam",
    password="team3_nam##",
    db="univ_db_team3",
    charset="utf8"
)

cursor = conn.cursor()

# ---------------------------------------
# 랜덤 날짜 생성
# ---------------------------------------
def random_created_at():
    days_ago = random.randint(0, 800)
    rand_date = datetime.now() - timedelta(days=days_ago)
    return rand_date.strftime("%Y-%m-%d %H:%M:%S")

# ---------------------------------------
# INSERT SQL
# ---------------------------------------
sql = """
INSERT INTO wishlist (
    user_id, product_id, created_at, del_yn
) VALUES (%s, %s, %s, %s)
"""

TOTAL = 4000
batch_size = 500
data_batch = []

for i in range(TOTAL):

    user_id = random.randint(1, 90000)
    product_id = random.randint(1, 3000)
    created_at = random_created_at()
    del_yn = random.choice([0, 1])

    data_batch.append((user_id, product_id, created_at, del_yn))

    if len(data_batch) == batch_size:
        cursor.executemany(sql, data_batch)
        conn.commit()
        print(f"{i+1} / {TOTAL} 데이터 삽입 완료")
        data_batch = []

# 남은 데이터 처리
if data_batch:
    cursor.executemany(sql, data_batch)
    conn.commit()

print("\n🎉 4,000개 wishlist 데이터 생성 완료!")
cursor.close()
conn.close()
