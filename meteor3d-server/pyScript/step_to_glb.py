import cascadio
import os
import sys

def convert_step_to_glb(input_path, output_path=None):
    """
    将STEP文件转换为GLB格式
    
    参数:
        input_path: 输入STEP文件的路径
        output_path: 输出GLB文件的路径（可选）
    """
    # 检查输入文件是否存在
    if not os.path.exists(input_path):
        print(f"错误：找不到文件 {input_path}")
        return False
    
    # 如果没有指定输出路径，自动生成一个
    if output_path is None:
        # 将输入文件的扩展名替换为.glb
        base_name = os.path.splitext(input_path)[0]
        output_path = f"{base_name}.glb"
    
    print(f"正在转换：{input_path}")
    print(f"输出文件：{output_path}")
    
    try:
        # 执行转换
        cascadio.step_to_glb(input_path, output_path)
        print("Convert success")
        return True
    except Exception as e:
        print(f"Convert failed: {e}")
        return False

if __name__ == "__main__":
    # 方式1：在脚本中直接指定文件路径
    # input_file = "你的模型.step"
    # convert_step_to_glb(input_file)
    
    # 方式2：通过命令行参数传入
    if len(sys.argv) < 2:
        print("用法：python convert_step.py <STEP文件路径> [输出GLB文件路径]")
        print("示例：python convert_step.py model.step output.glb")
        sys.exit(1)
    
    input_file = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else None
    
    success = convert_step_to_glb(input_file, output_file)
    sys.exit(0 if success else 1)