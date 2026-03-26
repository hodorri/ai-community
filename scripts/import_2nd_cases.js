const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

const supabase = createClient(
  'https://grdsgtgtdzyinqxfwhsq.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyZHNndGd0ZHp5aW5xeGZ3aHNxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzEyNjM1MCwiZXhwIjoyMDgyNzAyMzUwfQ.EfSq1BJqk_Omx-tthdrKviwH3GWRNrdLqJpHmEDfM_s'
);

// All folders (excluding 장병준 테스트)
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

function downloadFile(fileId) {
  try {
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
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
    // Check if the file was still saved despite error exit code
    const fs = require('fs');
    const os = require('os');
    const path = require('path');
    const tmpPath = path.join(os.tmpdir(), `gws_dl_${fileId}.md`);
    if (fs.existsSync(tmpPath)) {
      const content = fs.readFileSync(tmpPath, 'utf-8');
      fs.unlinkSync(tmpPath);
      return content;
    }
    return null;
  }
}

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
    // execSync might have the output in e.stdout
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

function parseAgentProfile(md) {
  const lines = md.split('\n');
  let title = '';
  let description = '';
  let aiTools = '';
  let background = '';

  let currentSection = '';

  for (const line of lines) {
    if (line.startsWith('# ')) {
      title = line.replace('# ', '').trim();
    } else if (line.match(/^##\s*(개요|Overview|소개|설명|Description)/i)) {
      currentSection = 'description';
    } else if (line.match(/^##\s*(사용.*툴|AI.*Tool|기술.*스택|Tech)/i)) {
      currentSection = 'tools';
    } else if (line.match(/^##\s*(배경|Background|개발.*배경|목적|Purpose)/i)) {
      currentSection = 'background';
    } else if (line.startsWith('## ')) {
      currentSection = 'other';
    } else if (currentSection === 'description' && line.trim()) {
      description += line + '\n';
    } else if (currentSection === 'tools' && line.trim()) {
      aiTools += line.replace(/^[-*]\s*/, '') + ', ';
    } else if (currentSection === 'background' && line.trim()) {
      background += line + '\n';
    }
  }

  // If no structured sections, use first few lines as description
  if (!description && !title) {
    const nonEmpty = lines.filter(l => l.trim() && !l.startsWith('#'));
    description = nonEmpty.slice(0, 5).join('\n');
    title = lines.find(l => l.startsWith('#'))?.replace(/^#+\s*/, '') || '';
  }

  return { title: title.trim(), description: description.trim(), aiTools: aiTools.replace(/, $/, '').trim(), background: background.trim() };
}

async function main() {
  console.log('AI Engineer 2기 활용사례 가져오기 시작...\n');

  let saved = 0;
  let skipped = 0;
  let errors = 0;

  for (const folder of folders) {
    process.stdout.write(`[${folder.name}] ${folder.team} ... `);

    // Find agent-profile.md
    const profileFileId = findFileInFolder(folder.id, 'agent-profile.md');
    const demoLogFileId = findFileInFolder(folder.id, 'demo-log.md');

    let profileContent = '';
    let demoContent = '';

    if (profileFileId) {
      profileContent = downloadFile(profileFileId) || '';
    }
    if (demoLogFileId) {
      demoContent = downloadFile(demoLogFileId) || '';
    }

    if (!profileContent && !demoContent) {
      console.log('파일 없음 - 스킵');
      skipped++;
      continue;
    }

    // Parse content
    const parsed = parseAgentProfile(profileContent);

    let title = parsed.title || `${folder.name}_AI 활용사례`;
    let content = '';

    if (parsed.description) {
      content += parsed.description + '\n\n';
    }
    if (parsed.background) {
      content += '<h3>개발 배경</h3>\n' + parsed.background + '\n\n';
    }
    if (demoContent) {
      content += '<h3>데모 로그</h3>\n<pre>' + demoContent.substring(0, 3000) + '</pre>\n';
    }

    if (!content.trim()) {
      content = profileContent || demoContent || '내용 없음';
    }

    // Convert markdown-ish content to basic HTML
    content = content
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>')
      .replace(/$/, '</p>');

    const driveUrl = `https://drive.google.com/drive/folders/${folder.id}`;
    const externalId = `2nd_${folder.name}_${folder.id.substring(0, 8)}`;

    // Check for duplicate
    const { data: existing } = await supabase
      .from('ai_cases')
      .select('id')
      .eq('external_id', externalId)
      .maybeSingle();

    if (existing) {
      console.log('중복 - 스킵');
      skipped++;
      continue;
    }

    // Insert
    const { error } = await supabase
      .from('ai_cases')
      .insert({
        title,
        content,
        author_name: folder.name,
        ai_tools: parsed.aiTools || null,
        development_background: parsed.background || null,
        ai_engineer_cohort: '2기',
        external_id: externalId,
        source_url: driveUrl,
      });

    if (error) {
      console.log('에러:', error.message);
      errors++;
    } else {
      console.log('저장 완료 -', title.substring(0, 40));
      saved++;
    }
  }

  console.log(`\n=== 완료 ===`);
  console.log(`저장: ${saved}건, 스킵: ${skipped}건, 에러: ${errors}건`);
}

main();
