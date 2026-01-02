"""
okman3.png 이미지에서 배경을 더 정확하게 제거하는 스크립트
"""

try:
    from PIL import Image
    import numpy as np
except ImportError:
    print("필요한 라이브러리를 설치해주세요:")
    print("pip install Pillow numpy")
    exit(1)

def remove_background_improved(input_path, output_path):
    """배경을 더 정확하게 투명하게 만들기"""
    # 이미지 열기
    img = Image.open(input_path).convert("RGBA")
    data = np.array(img)
    
    # RGB 채널 추출
    r, g, b, a = data[:, :, 0], data[:, :, 1], data[:, :, 2], data[:, :, 3]
    
    # 오렌지 배경 감지 (더 넓은 범위)
    # 오렌지색: R이 매우 높고, G가 중간, B가 낮음
    orange_mask = (
        (r > 220) & (g > 100) & (g < 250) & (b < 200)  # 밝은 오렌지
    ) | (
        (r > 200) & (g > 80) & (b < 180)  # 진한 오렌지
    ) | (
        (r > 240) & (g > 200) & (b > 150) & (b < 220)  # 연한 오렌지
    )
    
    # 가장자리 영역도 배경으로 처리 (안전장치)
    edge_thickness = 5
    h, w = data.shape[:2]
    edge_mask = np.zeros((h, w), dtype=bool)
    edge_mask[:edge_thickness, :] = True  # 상단
    edge_mask[-edge_thickness:, :] = True  # 하단
    edge_mask[:, :edge_thickness] = True  # 왼쪽
    edge_mask[:, -edge_thickness:] = True  # 오른쪽
    
    # 배경 마스크 결합
    background_mask = orange_mask | edge_mask
    
    # 알파 채널 업데이트 (배경을 투명하게)
    data[:, :, 3] = np.where(background_mask, 0, a)
    
    # 결과 이미지 저장
    result = Image.fromarray(data)
    result.save(output_path, "PNG")
    print(f"배경 제거 완료: {output_path}")
    return True

if __name__ == "__main__":
    input_file = "public/okman3.png"
    output_file = "public/okman3_transparent.png"
    
    try:
        if remove_background_improved(input_file, output_file):
            print("성공! okman3_transparent.png 파일이 업데이트되었습니다.")
    except FileNotFoundError:
        print(f"파일을 찾을 수 없습니다: {input_file}")
    except Exception as e:
        print(f"오류 발생: {e}")
        import traceback
        traceback.print_exc()
