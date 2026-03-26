const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const supabase = createClient(
  'https://grdsgtgtdzyinqxfwhsq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZHNndGd0ZHp5aW5xeGZ3aHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEyNjM1MCwiZXhwIjoyMDgyNzAyMzUwfQ.EfSq1BJqk_Omx-tthdrKviwH3GWRNrdLqJpHmEDfM_s'
);

const folders = [
  {id:'1KB1fk9klWS0fMXIdR2bITCq2UtRXNObl',name:'송제은',team:'OK IB금융기획팀'},
  {id:'15WhPvMzCeKVwaG2pVdUP2BRlpD-YVkqg',name:'표석종',team:'디지털데이터팀'},
  {id:'1OIY5RgcHbPGXfkUuxiZEuU-nRyulKcCV',name:'박한식',team:'IB금융1부1팀'},
  {id:'13D_arJnSSkOEe9k-99y0NUk3fIs0e-Jg',name:'김은정',team:'오피팀'},
  {id:'1zs2Cvq8QXgUik_-ZzFdgPi2zCLxRThnG',name:'박한식',team:'IB금융본부 1부 1팀'},
  {id:'1g0zB4Z0l5zSRCCMEcMSP2Ky-Zk9yvZPe',name:'서준일',team:'기업금융1본부'},
  {id:'115B-Ti9lLhF5CmS7YvwFfo5z33sK88O-',name:'이창주',team:'NPL사업팀'},
  {id:'1vTFlQvTPRyTGsF_cFDboNK7esBGNzetW',name:'곽민호',team:'여신사후관리팀'},
  {id:'1IJt1XYUiuux4I9RhpFvynnZdB_ZjDtud',name:'곽혜영',team:'OP운영1팀'},
  {id:'131V_FgQk3pBmYWQoMPJ2Q8FXRRbA52hK',name:'이한나',team:'OK저축은행 채널기획팀'},
  {id:'1XTiXZgbGg2DpO-60n_7_RfLx6DyHqGsA',name:'노휘성',team:'OK저축은행 IB금융2팀'},
  {id:'1UpmoiYNppb5BYwhM_A--Fat90gmZWCY7',name:'김민선',team:'OKH인사기획팀'},
  {id:'1ppz_6OuXx6gqsUElaG4Su1DW3eOXqmy-',name:'김태준',team:'오케이캐피탈 기업금융3부'},
  {id:'1BYLvHw5CVPpMfKwZGTQS0J-o9i3ch8m3',name:'박종현',team:'OKH 인재개발팀'},
  {id:'173HwpruvItU4YLGKMB9YOFqCpR6puabb',name:'김인주',team:'OK영업추진팀'},
  {id:'1GfVelKavgBgl5zIyeUNCqi4zREiKlA3x',name:'김태준',team:'오케이캐피탈 기업금융3부'},
  {id:'1C3oeE0p0n4tz7esw3XpL-QDpnpc5wBhe',name:'하경윤',team:'OK총무팀'},
  {id:'1UPDQOzf6zjfP8HqNU6pMD0XA2g9UUBm0',name:'박진호',team:'마케팅팀'},
  {id:'1plRYgredAJAB_6OeEnzC98L_xpTD31Ju',name:'유학현',team:'OKH전략기획팀'},
  {id:'1zjg7ZAH85Mocwu15rUgdid-5mAWMxJSb',name:'김은혜',team:'OC 영업추진팀'},
  {id:'1A6kui1uRYR8AB8Cz1xu2HPl4dI8GLBvl',name:'표석종',team:'OK디지털데이터팀'},
  {id:'1ZD50Dg6QWRNN0VrVGrfFQPOevmZI3fDU',name:'진구성',team:'OK모기지심사1팀'},
  {id:'1Op4VvxKetDSnGX2Nu_W2xkrY2ReYMP5L',name:'최윤서',team:'OKH연결회계팀'},
  {id:'1Q9zR5fOYpz7CYm5qLJe2bFiXmQNIJ0Gz',name:'한대현',team:'OK신용관리팀'},
  {id:'1qmikJOHXwVA-vn6xd2Kl97Fm6wTcCir1',name:'김민선',team:'OKH인사기획팀'},
  {id:'1hlGrAfqlHNt8dwBXHnagD-IP1csoojiK',name:'문미라',team:'OKH조직문화팀'},
  {id:'1mBssh8Zt-Sdal8SXpWec-RF6bW9zwJ-m',name:'박광훈',team:'디지털센터기획팀'},
  {id:'1NkyzQHKTVTJMnqF5MYsCfcl-ZwYa_wlb',name:'이윤아',team:'OK저축은행 OP운영팀 2본부'},
  {id:'1W8fmhXO6GZe_DxfiNLOw5jsGYxVcyokR',name:'김수빈',team:'OC전산팀'},
  {id:'1WBDppSZ6EfmK3bQF4Wimdaqn-9xgFclK',name:'김은혜',team:'OC'},
  {id:'1OSGNHqV2-AlGO_-6Xa2vByp5FdlQ9dwB',name:'이윤아',team:'OP운영팀2본부'},
  {id:'1LrMyYXvMVNrrgvnVh-six6qLjgcHij8E',name:'배준형',team:'OK홍보CSR팀'},
  {id:'10ocwaMpGw2xv4DokDfc6wDoz1tJr65XQ',name:'임채웅',team:'OK소비자금융기획팀'},
  {id:'1GyPc4VB3Glgs5vMFKrEY2iMxGxUKczGF',name:'박성진',team:'OC 영업기획팀'},
  {id:'1Hx6YNbaN2cCIxyW9ilmd1SGlsQVeW_gN',name:'김윤미',team:'경영관리팀'},
  {id:'13s6Fhl5BgZ_kZLLqd309N4yG4cetVqog',name:'박광훈',team:'디지털센터기획팀'},
  {id:'1wRITy0Ip6_wHZPSkufh4XU5kg1hnB3NK',name:'황정원',team:'OKH인사팀'},
  {id:'1oGwb0090Z6ZvQRFvzCM7wI0Xkc_hWUWQ',name:'김동건',team:'모기지심사팀'},
];

function findFileInFolder(folderId, fileName) {
  try {
    const params = JSON.stringify({
      q: `name='${fileName}' and '${folderId}' in parents`,
      fields: 'files(id,name)',
    });
    const result = execSync(
      `gws drive files list --params ${JSON.stringify(params)}`,
      { encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const jsonStart = result.indexOf('{');
    if (jsonStart === -1) return null;
    const parsed = JSON.parse(result.substring(jsonStart));
    return parsed.files && parsed.files.length > 0 ? parsed.files[0].id : null;
  } catch (e) {
    if (e.stdout) {
      try {
        const out = e.stdout.toString();
        const jsonStart = out.indexOf('{');
        if (jsonStart >= 0) {
          const parsed = JSON.parse(out.substring(jsonStart));
          return parsed.files && parsed.files.length > 0 ? parsed.files[0].id : null;
        }
      } catch (e2) {}
    }
    return null;
  }
}

function downloadFile(fileId) {
  try {
    const tmpPath = path.join(os.tmpdir(), `gws_dl_${fileId}.md`);
    const params = JSON.stringify({ fileId, alt: 'media' });
    execSync(
      `gws drive files get --params ${JSON.stringify(params)} --output "${tmpPath}"`,
      { encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, 'utf-8');
      fs.unlinkSync(tmpPath);
      return content;
    }
    return null;
  } catch (e) {
    const tmpPath = path.join(os.tmpdir(), `gws_dl_${fileId}.md`);
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, 'utf-8');
      fs.unlinkSync(tmpPath);
      return content;
    }
    return null;
  }
}

function parseAgentProfile(md) {
  const lines = md.split('\n');
  let title = '';
  let currentSection = '';
  const sections = {};

  for (const line of lines) {
    if (line.startsWith('# ') && !title) {
      title = line.replace(/^#+\s*/, '').replace(/^Agent Profile[:\s]*/i, '').trim();
    } else if (line.startsWith('## ') || line.startsWith('### ')) {
      currentSection = line.replace(/^#+\s*/, '').replace(/[\d]+\.\s*/, '').trim().toLowerCase();
    } else if (currentSection && line.trim()) {
      if (!sections[currentSection]) sections[currentSection] = [];
      sections[currentSection].push(line.trim());
    }
  }

  // Map sections to fields
  const getSection = (...keys) => {
    for (const k of keys) {
      for (const sk of Object.keys(sections)) {
        if (sk.includes(k)) return sections[sk].join('\n');
      }
    }
    return '';
  };

  const outputName = title || getSection('산출물', 'output');
  const background = getSection('해결하려는 문제', '배경', 'background', 'pain point', '목적', 'purpose', '현재 업무');
  const features = getSection('핵심 기능', '기능', 'feature', '설계 구조', '구조');
  const usageEffects = getSection('효과', 'effect', '기대', 'benefit', '성과', 'result', 'impact');
  const aiTools = getSection('기술 스택', '사용 도구', 'tech', 'tool', 'stack', 'api');
  const activityDetails = getSection('에이전트가 바꿔주는', 'to-be', '활동', 'activity');

  return { title: outputName, background, features, usageEffects, aiTools, activityDetails };
}

async function main() {
  console.log('AI Engineer 2기 활용사례 필드 정리 시작...\n');

  let updated = 0;
  let skipped = 0;

  for (const folder of folders) {
    const externalId = `2nd_${folder.name}_${folder.id.substring(0, 8)}`;

    // DB에서 기존 케이스 찾기
    const { data: existing } = await supabase
      .from('ai_cases')
      .select('id, title')
      .eq('external_id', externalId)
      .maybeSingle();

    if (!existing) {
      // 스킵 (파일 없어서 안 올라간 경우)
      continue;
    }

    process.stdout.write(`[${folder.name}] ${existing.title?.substring(0, 30)}... `);

    // agent-profile.md 다운로드
    const profileFileId = findFileInFolder(folder.id, 'agent-profile.md');
    if (!profileFileId) {
      console.log('파일 없음 - 스킵');
      skipped++;
      continue;
    }

    const profileContent = downloadFile(profileFileId);
    if (!profileContent) {
      console.log('다운로드 실패 - 스킵');
      skipped++;
      continue;
    }

    const parsed = parseAgentProfile(profileContent);
    const driveUrl = `https://drive.google.com/drive/folders/${folder.id}`;

    // 필드 업데이트
    const updateData = {
      output_name: parsed.title || existing.title,
      development_background: parsed.background || null,
      features: parsed.features || null,
      usage_effects: parsed.usageEffects || null,
      ai_tools: parsed.aiTools || null,
      activity_details: parsed.activityDetails || null,
      content: parsed.activityDetails || parsed.background || '',
      source_url: driveUrl,
      attached_file_url: driveUrl,
      attached_file_name: `${folder.name}_평가자료 (Google Drive)`,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('ai_cases')
      .update(updateData)
      .eq('id', existing.id);

    if (error) {
      console.log('에러:', error.message);
    } else {
      console.log('업데이트 완료');
      updated++;
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`업데이트: ${updated}건, 스킵: ${skipped}건`);
}

main();
