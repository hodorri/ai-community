import csv
import sys
import os

# CSV 파일 경로
csv_file = r'c:\Users\user\Downloads\AI Engineer(1기) 명단 - 시트1.csv'

# SQL 파일 생성
sql_file = 'scripts/first_engineer_insert.sql'

# CSV 파일 읽기
with open(csv_file, 'r', encoding='utf-8') as f:
    reader = csv.reader(f)
    
    # 헤더 2줄 건너뛰기
    next(reader)  # 첫 번째 헤더
    next(reader)  # 두 번째 헤더
    
    # SQL INSERT 문 생성
    sql_statements = []
    sql_statements.append("-- Insert data into first_engineer table\n")
    sql_statements.append("BEGIN;\n\n")
    
    for row in reader:
        if len(row) < 18:  # 최소 컬럼 수 확인
            continue
            
        # 데이터 정리 및 이스케이프
        def escape_sql(value):
            if not value or value.strip() == '':
                return 'NULL'
            # SQL injection 방지를 위해 작은따옴표 이스케이프
            escaped = value.replace("'", "''")
            return f"'{escaped}'"
        
        no = row[0] if row[0] else 'NULL'
        employee_id = escape_sql(row[1])
        name = escape_sql(row[2])
        gender = escape_sql(row[3])
        company = escape_sql(row[4])
        division1 = escape_sql(row[5])
        division2 = escape_sql(row[6])
        department2 = escape_sql(row[7])
        final_department = escape_sql(row[8])
        title = escape_sql(row[9])
        position = escape_sql(row[10])
        training_company = escape_sql(row[11])
        training_department = escape_sql(row[12])
        training_position = escape_sql(row[13])
        overall_rank = row[14] if row[14] and row[14].strip() else 'NULL'
        personal_rank = row[15] if row[15] and row[15].strip() else 'NULL'
        evaluation_result = escape_sql(row[16])
        tier = row[17] if row[17] and row[17].strip() else 'NULL'
        
        sql = f"""INSERT INTO first_engineer (
  no, employee_id, name, gender, company, division1, division2, department2,
  final_department, title, position, training_company, training_department,
  training_position, overall_rank, personal_rank, evaluation_result, tier
) VALUES (
  {no}, {employee_id}, {name}, {gender}, {company}, {division1}, {division2}, {department2},
  {final_department}, {title}, {position}, {training_company}, {training_department},
  {training_position}, {overall_rank}, {personal_rank}, {evaluation_result}, {tier}
);\n"""
        
        sql_statements.append(sql)
    
    sql_statements.append("\nCOMMIT;\n")
    
    # SQL 파일 저장
    with open(sql_file, 'w', encoding='utf-8') as f:
        f.writelines(sql_statements)
    
    print(f"SQL 파일이 생성되었습니다: {sql_file}")
    print(f"총 {len(sql_statements) - 3}개의 INSERT 문이 생성되었습니다.")
