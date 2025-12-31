"""
okman.png 이미지 편집 스크립트
- 배경을 투명하게 만들기
- 상단의 "AI Community" 텍스트 제거
"""

try:
    from PIL import Image, ImageDraw, ImageFont
    import numpy as np
except ImportError:
    print("필요한 라이브러리를 설치해주세요:")
    print("pip install Pillow numpy")
    exit(1)

def remove_background_and_text(input_path, output_path):
    """배경을 투명하게 만들고 상단 텍스트 제거"""
    # 이미지 열기
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    # 흰색 배경을 투명하게 만들기
    # RGB 값이 모두 높은 픽셀(흰색)을 투명하게
    white_threshold = 240
    mask = (data[:, :, 0] > white_threshold) & (data[:, :, 1] > white_threshold) & (data[:, :, 2] > white_threshold)
    data[:, :, 3][mask] = 0
    
    # 상단 영역(텍스트가 있을 수 있는 부분) 처리
    # 상단 20% 영역에서 흰색/밝은 색을 투명하게
    top_area = int(img.height * 0.2)
    top_mask = (data[:top_area, :, 0] > 200) & (data[:top_area, :, 1] > 200) & (data[:top_area, :, 2] > 200)
    data[:top_area, :, 3][top_mask] = 0
    
    # 결과 이미지 저장
    result = Image.fromarray(data)
    result.save(output_path, "PNG")
    print(f"이미지 편집 완료: {output_path}")

if __name__ == "__main__":
    input_file = "public/okman.png"
    output_file = "public/okman.png"  # 같은 파일에 덮어쓰기
    
    try:
        remove_background_and_text(input_file, output_file)
    except FileNotFoundError:
        print(f"파일을 찾을 수 없습니다: {input_file}")
    except Exception as e:
        print(f"오류 발생: {e}")
