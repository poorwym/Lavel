#!/usr/bin/env python3
"""
Lavel Backend 测试运行脚本

提供便捷的测试运行接口，支持不同的测试场景和选项
"""

import argparse
import subprocess
import sys
from pathlib import Path


def run_command(cmd, description=""):
    """运行命令并处理结果"""
    print(f"\n{'='*60}")
    if description:
        print(f"📋 {description}")
    print(f"🚀 Running: {' '.join(cmd)}")
    print(f"{'='*60}")
    
    result = subprocess.run(cmd, capture_output=False)
    
    if result.returncode != 0:
        print(f"\n❌ {description or 'Command'} failed with exit code {result.returncode}")
        return False
    else:
        print(f"\n✅ {description or 'Command'} completed successfully")
        return True


def main():
    parser = argparse.ArgumentParser(description='Run Lavel Backend tests')
    
    # 测试类型选项
    parser.add_argument('--all', action='store_true', help='Run all tests (default)')
    parser.add_argument('--blocks', action='store_true', help='Run blocks API tests only')
    parser.add_argument('--knowledges', action='store_true', help='Run knowledges API tests only')
    parser.add_argument('--thoughts', action='store_true', help='Run thoughts API tests only')
    parser.add_argument('--todos', action='store_true', help='Run todos API tests only')
    parser.add_argument('--reviews', action='store_true', help='Run reviews API tests only')
    
    # 测试选项
    parser.add_argument('--verbose', '-v', action='store_true', help='Verbose output')
    parser.add_argument('--coverage', '-c', action='store_true', help='Generate coverage report')
    parser.add_argument('--html-coverage', action='store_true', help='Generate HTML coverage report')
    parser.add_argument('--parallel', '-p', action='store_true', help='Run tests in parallel')
    parser.add_argument('--fail-fast', '-x', action='store_true', help='Stop at first failure')
    parser.add_argument('--no-header', action='store_true', help='Skip header information')
    
    # 过滤选项
    parser.add_argument('--filter', '-k', help='Run tests matching pattern')
    parser.add_argument('--marker', '-m', help='Run tests with specific marker')
    
    args = parser.parse_args()
    
    # 确保在正确的目录
    backend_dir = Path(__file__).parent
    if not (backend_dir / "pyproject.toml").exists():
        print("❌ Error: Must run from backend directory")
        sys.exit(1)
    
    if not args.no_header:
        print("🧪 Lavel Backend API Test Runner")
        print("=" * 60)
        print(f"📂 Working directory: {backend_dir.absolute()}")
        print(f"🐍 Python: {sys.executable}")
    
    # 构建 pytest 命令
    cmd = ["python", "-m", "pytest"]
    
    # 确定要运行的测试
    test_files = []
    if args.blocks:
        test_files.append("test/test_blocks_api.py")
    elif args.knowledges:
        test_files.append("test/test_knowledges_api.py")
    elif args.thoughts:
        test_files.append("test/test_thoughts_api.py")
    elif args.todos:
        test_files.append("test/test_todos_api.py")
    elif args.reviews:
        test_files.append("test/test_reviews_api.py")
    else:
        # 默认运行所有测试
        test_files.append("test/")
    
    cmd.extend(test_files)
    
    # 添加选项
    if args.verbose:
        cmd.append("-v")
    
    if args.fail_fast:
        cmd.append("-x")
    
    if args.parallel:
        cmd.extend(["-n", "auto"])
    
    if args.filter:
        cmd.extend(["-k", args.filter])
    
    if args.marker:
        cmd.extend(["-m", args.marker])
    
    # 覆盖率选项
    if args.coverage or args.html_coverage:
        cmd.extend([
            "--cov=api",
            "--cov=service", 
            "--cov=schemas",
            "--cov-report=term-missing"
        ])
        
        if args.html_coverage:
            cmd.extend(["--cov-report=html:htmlcov"])
    
    # 运行测试
    success = run_command(cmd, "Running tests")
    
    if not success:
        sys.exit(1)
    
    # 生成覆盖率报告后的提示
    if args.html_coverage:
        coverage_path = backend_dir / "htmlcov" / "index.html"
        if coverage_path.exists():
            print(f"\n📊 HTML coverage report generated: {coverage_path}")
            print(f"🌐 Open in browser: file://{coverage_path.absolute()}")
    
    print(f"\n🎉 All tests completed successfully!")


if __name__ == "__main__":
    main() 