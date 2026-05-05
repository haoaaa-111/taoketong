import { render, screen, fireEvent } from '@testing-library/react';
import Step1CourseGroup from '@/components/onboarding/Step1CourseGroup';
import CourseEditor from '@/components/onboarding/CourseEditor';
import type { SessionEntry } from '@/types';

const makeSession = (id: string, day: number, group = 'default'): SessionEntry => ({
    id,
    day_of_week: day,
    period_slot: '早一' as const,
    weeks: [1, 2, 3],
    sessionGroup: group,
});

describe('Step1CourseGroup', () => {
    const mockGroup = {
        name: '数据结构',
        teacher_name: '张教授',
        credits: 3,
        sessions: [
            makeSession('s1', 1, 'default'),
            makeSession('s2', 3, 'default'),
        ],
    };

    const defaultProps = {
        group: mockGroup,
        sessionGroups: ['default', '实验课'],
        onGroupChange: jest.fn(),
        onAddSessionGroup: jest.fn(),
        onDelete: jest.fn(),
    };

    it('renders course name and session count', () => {
        render(<Step1CourseGroup {...defaultProps} />);
        expect(screen.getByText('数据结构')).toBeInTheDocument();
        expect(screen.getByText('2 个课次')).toBeInTheDocument();
    });

    it('shows teacher and credits when available', () => {
        render(<Step1CourseGroup {...defaultProps} />);
        expect(screen.getByText('张教授')).toBeInTheDocument();
        expect(screen.getByText('3 学分')).toBeInTheDocument();
    });

    it('displays session group dropdown', () => {
        render(<Step1CourseGroup {...defaultProps} />);
        expect(screen.getAllByRole('combobox').length).toBeGreaterThanOrEqual(1);
    });

    it('highlights special sessions visually', () => {
        render(<Step1CourseGroup {...defaultProps} group={{
            ...mockGroup,
            sessions: [makeSession('s1', 1, '实验课')],
        }} />);
        const sessionEl = screen.getByText(/周一 早一/);
        const container = sessionEl.closest('div[class*="bg-yellow"]');
        expect(container).toBeTruthy();
    });
});

describe('CourseEditor', () => {
    const mockCourse = {
        name: '高等数学',
        location: 'A101',
        teacher_name: '李老师',
        credits: 4,
        weeks: [1, 2, 3, 4],
        day_of_week: 2,
        period_slot: '早一',
    };

    it('renders course name', () => {
        render(<CourseEditor course={mockCourse} onChange={jest.fn()} />);
        expect(screen.getByText('高等数学')).toBeInTheDocument();
    });

    it('adds rollcall method on + click', () => {
        const onChange = jest.fn();
        render(<CourseEditor course={mockCourse} onChange={onChange} />);

        fireEvent.click(screen.getByText('+ 添加点名方式'));

        expect(onChange).toHaveBeenCalledWith(
            expect.objectContaining({
                rollcall_methods: expect.arrayContaining([
                    expect.objectContaining({ method: '', frequency: '几乎不点' }),
                ]),
            })
        );
    });

    it('removes rollcall method on × click', () => {
        const onChange = jest.fn();
        render(<CourseEditor course={mockCourse} onChange={onChange} />);

        fireEvent.click(screen.getByText('+ 添加点名方式'));
        fireEvent.click(screen.getByText('×'));

        expect(onChange).toHaveBeenLastCalledWith(
            expect.objectContaining({ rollcall_methods: [] })
        );
    });

    it('shows custom input when custom method selected', () => {
        const onChange = jest.fn();
        render(<CourseEditor course={mockCourse} onChange={onChange} />);

        fireEvent.click(screen.getByText('+ 添加点名方式'));

        const selects = screen.getAllByRole('combobox');
        const rollcallSelect = Array.from(selects).find(el =>
            el.innerHTML.includes('选择...') && el.innerHTML.includes('自定义...')
        );
        expect(rollcallSelect).toBeTruthy();
        if (!rollcallSelect) return;
        fireEvent.change(rollcallSelect, { target: { value: 'custom' } });

        expect(screen.getByPlaceholderText('输入自定义点名方式')).toBeInTheDocument();
    });

    it('notes placeholder matches requirements', () => {
        const onChange = jest.fn();
        render(<CourseEditor course={mockCourse} onChange={onChange} />);

        expect(screen.getByPlaceholderText(/老师具体的点名习惯/)).toBeInTheDocument();
    });

    it('frequency dropdown includes 几乎不点', () => {
        const onChange = jest.fn();
        render(<CourseEditor course={mockCourse} onChange={onChange} />);

        fireEvent.click(screen.getByText('+ 添加点名方式'));

        const freqSelect = screen.getAllByRole('combobox').find(sel => {
            return sel.innerHTML.includes('几乎不点');
        });
        expect(freqSelect).toBeTruthy();
    });
});
