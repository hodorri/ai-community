#!/usr/bin/env python3
# -*- coding: utf-8 -*-
import sys
import json
import time
from datetime import datetime
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.action_chains import ActionChains
from selenium.common.exceptions import TimeoutException, NoSuchElementException, WebDriverException

def login(driver, email, password):
    """사이트에 자동 로그인"""
    try:
        print("로그인 페이지로 이동 중...", file=sys.stderr)
        driver.get("https://ok-hrd-edu-ai1.lovable.app/")
        
        # 페이지가 완전히 로드될 때까지 대기
        print("페이지 로드 대기 중...", file=sys.stderr)
        WebDriverWait(driver, 30).until(
            lambda d: d.execute_script("return document.readyState") == "complete"
        )
        time.sleep(3)  # 추가 대기 시간
        
        print(f"현재 URL: {driver.current_url}", file=sys.stderr)
        print(f"페이지 제목: {driver.title}", file=sys.stderr)
        
        # JavaScript로 모든 input 요소 정보 수집
        print("페이지의 모든 input 요소 확인 중...", file=sys.stderr)
        all_inputs_info = driver.execute_script("""
            var inputs = document.querySelectorAll('input');
            var info = [];
            for (var i = 0; i < inputs.length; i++) {
                var inp = inputs[i];
                info.push({
                    index: i,
                    type: inp.type || '',
                    name: inp.name || '',
                    id: inp.id || '',
                    placeholder: inp.placeholder || '',
                    className: inp.className || '',
                    tagName: inp.tagName || ''
                });
            }
            return info;
        """)
        
        print(f"페이지에 {len(all_inputs_info)}개의 input 요소가 있습니다:", file=sys.stderr)
        for inp_info in all_inputs_info:
            print(f"  Input {inp_info['index']}: type={inp_info['type']}, name={inp_info['name']}, id={inp_info['id']}, placeholder={inp_info['placeholder']}", file=sys.stderr)
        
        # JavaScript로 이메일 입력 필드 찾기
        email_input = None
        try:
            email_input = driver.execute_script("""
                // 여러 방법으로 이메일 입력 필드 찾기
                var selectors = [
                    'input[type="email"]',
                    'input[name="email"]',
                    'input[id="email"]',
                    'input[placeholder*="email" i]',
                    'input[placeholder*="이메일"]',
                    'input[type="text"][name*="email" i]',
                    'input[type="text"][id*="email" i]'
                ];
                
                for (var i = 0; i < selectors.length; i++) {
                    var elem = document.querySelector(selectors[i]);
                    if (elem) {
                        elem.scrollIntoView({behavior: 'smooth', block: 'center'});
                        return elem;
                    }
                }
                
                // 모든 input 중에서 이메일로 보이는 것 찾기
                var inputs = document.querySelectorAll('input[type="text"], input[type="email"]');
                for (var i = 0; i < inputs.length; i++) {
                    var inp = inputs[i];
                    var name = (inp.name || '').toLowerCase();
                    var id = (inp.id || '').toLowerCase();
                    var placeholder = (inp.placeholder || '').toLowerCase();
                    if (name.includes('email') || id.includes('email') || placeholder.includes('email') || placeholder.includes('이메일')) {
                        inp.scrollIntoView({behavior: 'smooth', block: 'center'});
                        return inp;
                    }
                }
                return null;
            """)
        except Exception as e:
            print(f"JavaScript로 이메일 필드 찾기 오류: {str(e)}", file=sys.stderr)
        
        # Python으로도 찾기 시도
        if not email_input:
            email_selectors = [
                (By.NAME, "email"),
                (By.ID, "email"),
                (By.CSS_SELECTOR, "input[type='email']"),
                (By.CSS_SELECTOR, "input[name='email']"),
                (By.CSS_SELECTOR, "input[id='email']"),
                (By.CSS_SELECTOR, "input[type='text'][name*='email' i]"),
                (By.XPATH, "//input[@type='email']"),
                (By.XPATH, "//input[@name='email']"),
                (By.XPATH, "//input[@id='email']")
            ]
            
            for selector_type, selector_value in email_selectors:
                try:
                    print(f"이메일 입력 필드 찾기 시도: {selector_type} = {selector_value}", file=sys.stderr)
                    email_input = WebDriverWait(driver, 3).until(
                        EC.presence_of_element_located((selector_type, selector_value))
                    )
                    print(f"이메일 입력 필드 찾음: {selector_type} = {selector_value}", file=sys.stderr)
                    break
                except:
                    continue
        
        if not email_input:
            raise Exception("이메일 입력 필드를 찾을 수 없습니다. 페이지 구조를 확인해주세요.")
        
        # 이메일 입력
        driver.execute_script("arguments[0].value = '';", email_input)
        email_input.clear()
        email_input.send_keys(email)
        print("이메일 입력 완료", file=sys.stderr)
        time.sleep(1)
        
        # JavaScript로 비밀번호 입력 필드 찾기
        password_input = None
        try:
            password_input = driver.execute_script("""
                // 여러 방법으로 비밀번호 입력 필드 찾기
                var selectors = [
                    'input[type="password"]',
                    'input[name="password"]',
                    'input[id="password"]',
                    'input[placeholder*="password" i]',
                    'input[placeholder*="비밀번호"]',
                    'input[name*="pass" i]'
                ];
                
                for (var i = 0; i < selectors.length; i++) {
                    var elem = document.querySelector(selectors[i]);
                    if (elem) {
                        elem.scrollIntoView({behavior: 'smooth', block: 'center'});
                        return elem;
                    }
                }
                
                // 모든 input 중에서 비밀번호로 보이는 것 찾기
                var inputs = document.querySelectorAll('input[type="password"]');
                if (inputs.length > 0) {
                    inputs[0].scrollIntoView({behavior: 'smooth', block: 'center'});
                    return inputs[0];
                }
                return null;
            """)
        except Exception as e:
            print(f"JavaScript로 비밀번호 필드 찾기 오류: {str(e)}", file=sys.stderr)
        
        # Python으로도 찾기 시도
        if not password_input:
            password_selectors = [
                (By.NAME, "password"),
                (By.ID, "password"),
                (By.CSS_SELECTOR, "input[type='password']"),
                (By.CSS_SELECTOR, "input[name='password']"),
                (By.XPATH, "//input[@type='password']")
            ]
            
            for selector_type, selector_value in password_selectors:
                try:
                    print(f"비밀번호 입력 필드 찾기 시도: {selector_type} = {selector_value}", file=sys.stderr)
                    password_input = WebDriverWait(driver, 3).until(
                        EC.presence_of_element_located((selector_type, selector_value))
                    )
                    print(f"비밀번호 입력 필드 찾음: {selector_type} = {selector_value}", file=sys.stderr)
                    break
                except:
                    continue
        
        if not password_input:
            raise Exception("비밀번호 입력 필드를 찾을 수 없습니다")
        
        # 비밀번호 입력
        driver.execute_script("arguments[0].value = '';", password_input)
        password_input.clear()
        password_input.send_keys(password)
        print("비밀번호 입력 완료", file=sys.stderr)
        time.sleep(1)
        
        # JavaScript로 로그인 버튼 찾기
        login_button = None
        try:
            login_button = driver.execute_script("""
                // 여러 방법으로 로그인 버튼 찾기
                var selectors = [
                    'button[type="submit"]',
                    'input[type="submit"]',
                    'button:contains("로그인")',
                    'button:contains("Login")',
                    'button[class*="login" i]',
                    'button[class*="submit" i]',
                    'button.btn-primary',
                    'button[class*="primary" i]'
                ];
                
                // CSS 선택자로 찾기
                for (var i = 0; i < selectors.length; i++) {
                    try {
                        var elem = document.querySelector(selectors[i]);
                        if (elem && elem.offsetParent !== null) { // 화면에 보이는 요소만
                            elem.scrollIntoView({behavior: 'smooth', block: 'center'});
                            return elem;
                        }
                    } catch(e) {}
                }
                
                // 모든 버튼 중에서 로그인 관련 텍스트가 있는 것 찾기
                var buttons = document.querySelectorAll('button, input[type="submit"]');
                for (var i = 0; i < buttons.length; i++) {
                    var btn = buttons[i];
                    var text = (btn.textContent || btn.value || '').toLowerCase();
                    var className = (btn.className || '').toLowerCase();
                    if (text.includes('로그인') || text.includes('login') || 
                        className.includes('login') || className.includes('submit')) {
                        if (btn.offsetParent !== null) { // 화면에 보이는 요소만
                            btn.scrollIntoView({behavior: 'smooth', block: 'center'});
                            return btn;
                        }
                    }
                }
                
                // 마지막으로 type="submit"인 첫 번째 버튼
                var submitBtn = document.querySelector('button[type="submit"], input[type="submit"]');
                if (submitBtn) {
                    submitBtn.scrollIntoView({behavior: 'smooth', block: 'center'});
                    return submitBtn;
                }
                
                return null;
            """)
        except Exception as e:
            print(f"JavaScript로 로그인 버튼 찾기 오류: {str(e)}", file=sys.stderr)
        
        # Python으로도 찾기 시도
        if not login_button:
            button_selectors = [
                (By.CSS_SELECTOR, "button[type='submit']"),
                (By.XPATH, "//button[contains(text(), '로그인')]"),
                (By.XPATH, "//button[contains(text(), 'Login')]"),
                (By.XPATH, "//button[@type='submit']"),
                (By.CSS_SELECTOR, "input[type='submit']"),
                (By.CSS_SELECTOR, "button.btn-primary")
            ]
            
            for selector_type, selector_value in button_selectors:
                try:
                    print(f"로그인 버튼 찾기 시도: {selector_type} = {selector_value}", file=sys.stderr)
                    login_button = WebDriverWait(driver, 3).until(
                        EC.element_to_be_clickable((selector_type, selector_value))
                    )
                    print(f"로그인 버튼 찾음: {selector_type} = {selector_value}", file=sys.stderr)
                    break
                except:
                    continue
        
        if not login_button:
            # 모든 버튼 찾기 시도 (디버깅용)
            try:
                all_buttons = driver.find_elements(By.TAG_NAME, "button")
                print(f"페이지의 모든 버튼 ({len(all_buttons)}개):", file=sys.stderr)
                for i, btn in enumerate(all_buttons):
                    try:
                        print(f"  Button {i}: text={btn.text}, type={btn.get_attribute('type')}, class={btn.get_attribute('class')}", file=sys.stderr)
                    except:
                        pass
            except:
                pass
            raise Exception("로그인 버튼을 찾을 수 없습니다")
        
        # 로그인 버튼 클릭 (JavaScript로도 시도)
        try:
            driver.execute_script("arguments[0].click();", login_button)
            print("로그인 버튼 클릭 (JavaScript)", file=sys.stderr)
        except:
            login_button.click()
            print("로그인 버튼 클릭 (Python)", file=sys.stderr)
        time.sleep(3)
        
        # 로그인 완료 대기 (URL 변경 확인)
        print("로그인 완료 대기 중...", file=sys.stderr)
        current_url = driver.current_url
        print(f"현재 URL: {current_url}", file=sys.stderr)
        
        # URL이 변경되거나 특정 요소가 나타날 때까지 대기
        WebDriverWait(driver, 20).until(
            lambda d: d.current_url != "https://ok-hrd-edu-ai1.lovable.app/" and d.current_url != "https://ok-hrd-edu-ai1.lovable.app"
        )
        
        time.sleep(2)
        print(f"로그인 완료. 현재 URL: {driver.current_url}", file=sys.stderr)
        return True
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        print(f"로그인 오류 상세: {error_trace}", file=sys.stderr)
        print(json.dumps({
            "success": False,
            "error": f"로그인 실패: {str(e)}"
        }), file=sys.stderr)
        return False

def collect_cases(driver):
    """게시글을 자동으로 수집"""
    selected_cases = []
    
    # 관리자 페이지로 이동
    try:
        print("관리자 페이지로 이동 중...", file=sys.stderr)
        driver.get("https://ok-hrd-edu-ai1.lovable.app/admin")
        time.sleep(5)  # 페이지 로드 대기 시간 증가
        print(f"현재 URL: {driver.current_url}", file=sys.stderr)
        
        # 페이지 소스 확인 (디버깅용)
        page_source_preview = driver.page_source[:500] if len(driver.page_source) > 500 else driver.page_source
        print(f"페이지 소스 미리보기: {page_source_preview}", file=sys.stderr)
    except Exception as e:
        print(f"관리자 페이지 이동 오류: {str(e)}", file=sys.stderr)
        return selected_cases
    
    # JavaScript로 게시글 자동 수집
    try:
        print("게시글 수집 시작...", file=sys.stderr)
        selected_items = driver.execute_script("""
            var cases = [];
            var items = [];
            
            // 다양한 선택자로 게시글 찾기
            var selectors = [
                'article',
                'tr[data-id]',
                '.post-item',
                '.case-item',
                '.card',
                '[data-post-id]',
                '.list-item',
                'tbody tr',
                'div[class*="post"]',
                'div[class*="case"]',
                'div[class*="item"]',
                'a[href*="/post/"]',
                'a[href*="/case/"]',
                'a[href*="/admin/"]'
            ];
            
            for (var i = 0; i < selectors.length; i++) {
                var elements = document.querySelectorAll(selectors[i]);
                for (var j = 0; j < elements.length; j++) {
                    var elem = elements[j];
                    if (items.indexOf(elem) === -1) {
                        items.push(elem);
                    }
                }
            }
            
            console.log('찾은 요소 개수:', items.length);
            
            // 각 요소에서 정보 추출
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                var caseData = {
                    title: '',
                    content: '',
                    url: window.location.href
                };
                
                // 제목 찾기 (여러 방법 시도)
                var titleSelectors = ['h1', 'h2', 'h3', 'h4', 'h5', '.title', '[class*="title"]', 'td:first-child', 'a', 'strong', 'b'];
                for (var j = 0; j < titleSelectors.length; j++) {
                    var titleElem = item.querySelector ? item.querySelector(titleSelectors[j]) : null;
                    if (titleElem && titleElem.textContent && titleElem.textContent.trim()) {
                        caseData.title = titleElem.textContent.trim();
                        break;
                    }
                }
                
                // 내용 찾기
                var contentSelectors = ['.content', '.description', 'p', 'td:nth-child(2)', '[class*="content"]', '[class*="description"]', 'span'];
                for (var j = 0; j < contentSelectors.length; j++) {
                    var contentElem = item.querySelector ? item.querySelector(contentSelectors[j]) : null;
                    if (contentElem && contentElem.textContent && contentElem.textContent.trim()) {
                        caseData.content = contentElem.textContent.trim();
                        break;
                    }
                }
                
                // 링크 찾기
                var linkElem = item.querySelector ? item.querySelector('a') : null;
                if (linkElem && linkElem.href) {
                    caseData.url = linkElem.href;
                } else if (item.tagName === 'A' && item.href) {
                    caseData.url = item.href;
                }
                
                // 유효한 데이터만 추가
                if (caseData.title || caseData.content) {
                    // 중복 체크
                    var isDuplicate = cases.some(function(existing) {
                        return existing.url === caseData.url && existing.title === caseData.title;
                    });
                    
                    if (!isDuplicate) {
                        cases.push(caseData);
                        console.log('수집된 항목:', caseData.title || '제목 없음');
                    }
                }
            }
            
            console.log('총 수집된 항목:', cases.length);
            return cases;
        """)
        
        print(f"JavaScript로 수집된 항목: {len(selected_items)}개", file=sys.stderr)
        
        # 수집된 항목 처리
        for item in selected_items:
            try:
                url = item.get("url", driver.current_url) if isinstance(item, dict) else getattr(item, "url", driver.current_url)
                title = item.get("title", "제목 없음") if isinstance(item, dict) else getattr(item, "title", "제목 없음")
                content = item.get("content", "") if isinstance(item, dict) else getattr(item, "content", "")
                
                # 빈 제목과 내용은 건너뛰기
                if not title or title == "제목 없음":
                    if not content or len(content.strip()) < 10:
                        continue
                
                external_id = url.split("/")[-1] if "/" in url else f"item_{int(time.time())}"
                if not external_id or external_id == "" or external_id == "admin":
                    external_id = f"item_{int(time.time())}_{len(selected_cases)}"
                
                selected_cases.append({
                    "title": title[:200] if len(title) > 200 else title if title else "제목 없음",
                    "content": content[:5000] if len(content) > 5000 else content,
                    "source_url": url,
                    "external_id": external_id,
                    "published_at": datetime.now().isoformat()
                })
                
                print(f"처리된 항목: {title[:50]}...", file=sys.stderr)
            except Exception as e:
                print(f"항목 처리 오류: {str(e)}", file=sys.stderr)
                continue
        
        print(f"\n총 {len(selected_cases)}개의 게시글을 수집했습니다.", file=sys.stderr)
        
    except Exception as e:
        print(f"\n게시글 수집 오류: {str(e)}", file=sys.stderr)
        import traceback
        traceback.print_exc(file=sys.stderr)
    
    # 브라우저를 5초간 열어둠 (사용자가 확인할 수 있도록)
    print("\n브라우저가 5초간 열려있습니다. 페이지를 확인하세요...", file=sys.stderr)
    time.sleep(5)
    
    return selected_cases

def main():
    email = "admin2026@okfg.com"
    password = "admin2026"
    
    # Chrome 옵션 설정 (headless 모드 제거 - 브라우저 창 표시)
    chrome_options = Options()
    # headless 모드 제거
    # chrome_options.add_argument("--headless")  # 주석 처리
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--start-maximized")  # 최대화된 창으로 시작
    chrome_options.add_argument("--disable-blink-features=AutomationControlled")
    chrome_options.add_experimental_option("excludeSwitches", ["enable-automation"])
    chrome_options.add_experimental_option('useAutomationExtension', False)
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    
    driver = None
    try:
        print("Chrome 브라우저를 시작합니다...", file=sys.stderr)
        # Chrome 드라이버 초기화
        driver = webdriver.Chrome(options=chrome_options)
        driver.implicitly_wait(5)
        driver.set_page_load_timeout(30)
        
        # 로그인
        if not login(driver, email, password):
            sys.exit(1)
        
        # 게시글 자동 수집
        cases = collect_cases(driver)
        
        if not cases:
            print(json.dumps({
                "success": True,
                "cases": [],
                "count": 0,
                "message": "선택된 게시물이 없습니다."
            }, ensure_ascii=False))
        else:
            # JSON 출력
            print(json.dumps({
                "success": True,
                "cases": cases,
                "count": len(cases)
            }, ensure_ascii=False))
        
    except WebDriverException as e:
        error_msg = f"웹드라이버 오류: {str(e)}"
        print(json.dumps({
            "success": False,
            "error": error_msg
        }), file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        error_msg = f"예상치 못한 오류: {str(e)}"
        print(json.dumps({
            "success": False,
            "error": error_msg
        }), file=sys.stderr)
        sys.exit(1)
    finally:
        if driver:
            # 브라우저를 3초간 더 열어둔 후 자동 종료
            print("\n브라우저를 3초 후 자동으로 닫습니다...", file=sys.stderr)
            try:
                time.sleep(3)
            except:
                pass
            try:
                driver.quit()
                print("브라우저가 닫혔습니다.", file=sys.stderr)
            except:
                pass

if __name__ == "__main__":
    main()
