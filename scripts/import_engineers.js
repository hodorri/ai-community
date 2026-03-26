const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(
  'https://grdsgtgtdzyinqxfwhsq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZHNndGd0ZHp5aW5xeGZ3aHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEyNjM1MCwiZXhwIjoyMDgyNzAyMzUwfQ.EfSq1BJqk_Omx-tthdrKviwH3GWRNrdLqJpHmEDfM_s'
);

function parseSheet(file) {
  const raw = fs.readFileSync(file, 'utf-8');
  const jsonStart = raw.indexOf('{');
  return JSON.parse(raw.substring(jsonStart));
}

async function main() {
  // 기존 데이터 삭제
  console.log('기존 데이터 삭제...');
  await supabase.from('ai_engineers').delete().neq('id', '00000000-0000-0000-0000-000000000000');

  // 1기 파싱
  const s1 = parseSheet('scripts/sheet_1ki.json');
  // headers: ['', '고유사번', '이름', '성별', '회사', '소속2(부)', '최종소속', '호칭', '직책', 'tier']
  const engineers1 = [];
  for (let i = 1; i < s1.values.length; i++) {
    const row = s1.values[i];
    if (!row || !row[2]) continue; // 이름 없으면 스킵
    engineers1.push({
      cohort: '1기',
      employee_number: row[1] || null,
      name: row[2],
      company: row[4] || null,
      department: row[6] || row[5] || null, // 최종소속 or 소속2
      title: row[7] || null, // 호칭
      position: row[8] || null, // 직책
      tier: row[9] || null,
    });
  }

  // 2기 파싱
  const s2 = parseSheet('scripts/sheet_2ki.json');
  // headers: ['NO', '고유사번', '이름', '회사', '소속 팀', '호칭', '직책', 'tier']
  const engineers2 = [];
  for (let i = 1; i < s2.values.length; i++) {
    const row = s2.values[i];
    if (!row || !row[2]) continue;
    engineers2.push({
      cohort: '2기',
      employee_number: row[1] || null,
      name: row[2],
      company: row[3] || null,
      department: row[4] || null,
      title: row[5] || null,
      position: row[6] || null,
      tier: row[7] || null,
    });
  }

  console.log(`1기: ${engineers1.length}명, 2기: ${engineers2.length}명`);

  // 일괄 삽입
  const all = [...engineers1, ...engineers2];
  const batchSize = 50;

  for (let i = 0; i < all.length; i += batchSize) {
    const batch = all.slice(i, i + batchSize);
    const { error } = await supabase.from('ai_engineers').insert(batch);
    if (error) {
      console.log(`배치 ${i} 에러:`, error.message);
    } else {
      console.log(`배치 ${i}-${i + batch.length} 삽입 완료`);
    }
  }

  // 확인
  const { count } = await supabase.from('ai_engineers').select('*', { count: 'exact', head: true });
  console.log(`\n총 ${count}명 저장 완료`);
}

main();
