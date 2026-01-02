"""
okman3.png 이미지에서 배경 제거 스크립트
Pillow를 사용하여 흰색/오렌지 배경을 투명하게 만듭니다.
"""

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("필요한 라이브러리를 설치해주세요:")
    print("pip install Pillow numpy")
    exit(1)

def remove_background(input_path, output_path):
    """배경을 투명하게 만들기"""
    # 이미지 열기
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    # RGB 채널 추출
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # 오렌지/흰색 배경 감지 및 제거
    # 오렌지색 범위: R이 높고, G가 중간, B가 낮음
    # 흰색 범위: R, G, B가 모두 높음
    orange_mask = (
        (r > 200) & (g > 150) & (g < 250) & (b < 150)  # 오렌지색
    ) | (
        (r > 240) & (g > 240) & (b > 240)  # 흰색
    )
    
    # 알파 채널 업데이트 (배경을 투명하게)
    data[:, :, 3] = np.where(orange_mask, 0, a)
    
    # 결과 이미지 저장
    result = Image.fromarray(data)
    result.save(output_path, "PNG")
    print(f"배경 제거 완료: {output_path}")
    return True

if __name__ == "__main__":
    input_file = "public/okman3.png"
    output_file = "public/okman3_transparent.png"
    
    try:
        if remove_background(input_file, output_file):
            print("성공! okman3_transparent.png 파일이 생성되었습니다.")
            print("컴포넌트에서 이 파일을 사용하도록 변경하세요.")
    except FileNotFoundError:
        print(f"파일을 찾을 수 없습니다: {input_file}")
    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()
