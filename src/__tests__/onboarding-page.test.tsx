import { render, screen } from '@testing-library/react';
import OnboardingPage from '@/app/onboarding/page';

jest.mock('next/link', () => {
  return ({ children, href, className }: { children: React.ReactNode; href: string; className?: string }) => (
    <a href={href} className={className}>{children}</a>
  );
});

describe('Onboarding welcome page', () => {
  beforeEach(() => {
    render(<OnboardingPage />);
  });

  it('renders the page title and subtitle', () => {
    expect(screen.getByText('🎯 逃课通')).toBeInTheDocument();
    expect(screen.getByText(/AI 自动生成逃课方案/)).toBeInTheDocument();
  });

  it('renders all 3 timeline steps', () => {
    expect(screen.getByText('导入课表')).toBeInTheDocument();
    expect(screen.getByText('设定偏好')).toBeInTheDocument();
    expect(screen.getByText('校对课程')).toBeInTheDocument();
    expect(screen.getByText('上传截图或手动录入')).toBeInTheDocument();
    expect(screen.getByText('选择你的逃课目标和习惯')).toBeInTheDocument();
    expect(screen.getByText('逐门确认老师、点名等细节')).toBeInTheDocument();
  });

  it('renders the info table with all 8 rows', () => {
    expect(screen.getByText('课表截图')).toBeInTheDocument();
    expect(screen.getByText('学期时间')).toBeInTheDocument();
    expect(screen.getByText('逃课目标')).toBeInTheDocument();
    expect(screen.getByText('逃课习惯')).toBeInTheDocument();
    expect(screen.getByText('到教室时间')).toBeInTheDocument();
    expect(screen.getByText('计划跨度')).toBeInTheDocument();
    expect(screen.getByText('课程硬信息')).toBeInTheDocument();
    expect(screen.getByText('课程软信息')).toBeInTheDocument();
  });

  it('renders the CTA button linking to step 1', () => {
    const link = screen.getByRole('link', { name: /开始使用/ });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/onboarding/step1');
  });
});
