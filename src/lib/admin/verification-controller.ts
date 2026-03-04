import { supabase } from '../supabase-browser';

export class VerificationController {
    private currentStatus: string = 'temp_verified';
    private allUsers: any[] = [];
    private currentUser: any;

    constructor(currentUser: any) {
        this.currentUser = currentUser;
        this.init();
    }

    private init() {
        (window as any).controllerLoaded = true;
        this.bindEvents();
        this.loadUsers(this.currentStatus);
    }

    private bindEvents() {
        const statusTabs = document.querySelectorAll('.status-tab');
        statusTabs.forEach((tab) => {
            tab.addEventListener('click', () => {
                this.currentStatus = (tab as HTMLElement).dataset.status!;
                statusTabs.forEach((t) => t.classList.remove('active'));
                tab.classList.add('active');
                this.updateTableHeader(this.currentStatus);
                this.loadUsers(this.currentStatus);
            });
        });

        // Search
        const searchInput = document.getElementById('userSearch') as HTMLInputElement;
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterUsers((e.target as HTMLInputElement).value);
            });
        }

        // Close Modal
        document.getElementById('closeModal')?.addEventListener('click', () => this.closeModal());
        document.getElementById('userDetailModal')?.addEventListener('click', (e) => {
            if ((e.target as HTMLElement).classList.contains('modal-overlay')) {
                this.closeModal();
            }
        });
    }

    private updateTableHeader(status: string) {
        const dateHeader = document.getElementById('dateHeader');
        if (dateHeader) {
            const headerTexts: Record<string, string> = {
                temp_verified: '인증요청일',
                verified: '관리자인증일',
                list: '자동인증일',
                rejected: '인증취소일',
                none: '가입일',
            };
            dateHeader.textContent = headerTexts[status] || '날짜';
        }
    }

    public async loadUsers(status: string) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">로딩 중...</td></tr>';

        try {
            const { data: requests, error: reqError } = await supabase
                .from('verification_requests')
                .select('*')
                .order('verification_date', { ascending: false });

            if (reqError) throw reqError;

            let profQuery = supabase.from('profiles').select('*').eq('verification_status', status);

            if (status !== 'none') {
                profQuery = profQuery.not('society_email', 'is', null);
            }

            const { data: profiles, error: profError } = await profQuery;
            if (profError) throw profError;

            this.allUsers = (profiles || []).map((profile) => {
                const request = (requests || []).find((req) => req.user_id === profile.id);
                return {
                    ...profile,
                    reason: request?.reason || '-',
                    reject_reason: request?.reject_reason || '-',
                    rejected_at: request?.rejected_at,
                    approved_at: request?.approved_at,
                    request_id: request?.id,
                };
            });

            this.updateCounts();
            this.renderUsers(this.allUsers);
        } catch (err) {
            console.error('Load Users Error:', err);
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">오류가 발생했습니다.</td></tr>';
        }
    }

    private renderUsers(users: any[]) {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="empty-state">해당 상태의 사용자가 없습니다.</td></tr>';
            return;
        }

        tbody.innerHTML = users
            .map((user) => {
                let dateToShow = '-';
                if (this.currentStatus === 'temp_verified') {
                    dateToShow = user.verification_date
                        ? new Date(user.verification_date).toLocaleDateString('ko-KR')
                        : '-';
                } else if (this.currentStatus === 'verified') {
                    dateToShow = user.approved_at ? new Date(user.approved_at).toLocaleDateString('ko-KR') : '-';
                } else if (this.currentStatus === 'list') {
                    dateToShow = user.verification_date
                        ? new Date(user.verification_date).toLocaleDateString('ko-KR')
                        : '-';
                } else if (this.currentStatus === 'rejected') {
                    dateToShow = user.rejected_at ? new Date(user.rejected_at).toLocaleDateString('ko-KR') : '-';
                } else if (this.currentStatus === 'none') {
                    dateToShow = user.created_at ? new Date(user.created_at).toLocaleDateString('ko-KR') : '-';
                }

                return `
                    <tr data-user-id="${user.id}">
                        <td>${user.real_name || user.nickname || '이름 없음'}</td>
                        <td>${user.affiliation || '-'}</td>
                        <td>${user.classification || '-'}</td>
                        <td>${dateToShow}</td>
                    </tr>
                `;
            })
            .join('');

        tbody.querySelectorAll('tr[data-user-id]').forEach((row) => {
            row.addEventListener('click', () => {
                const userId = (row as HTMLElement).dataset.userId;
                const user = users.find((u) => u.id === userId);
                if (user) this.showUserDetail(user);
            });
        });
    }

    public filterUsers(query: string) {
        if (!query.trim()) {
            this.renderUsers(this.allUsers);
            return;
        }

        const filtered = this.allUsers.filter((user) => {
            const searchText =
                `${user.real_name || ''} ${user.nickname || ''} ${user.login_email || ''} ${user.society_email || ''} ${user.affiliation || ''}`.toLowerCase();
            return searchText.includes(query.toLowerCase());
        });

        this.renderUsers(filtered);
    }

    private showUserDetail(user: any) {
        document.getElementById('modalUserName')!.textContent = user.real_name || user.nickname || '사용자';
        document.getElementById('detailEmail')!.textContent = user.society_email || user.login_email || '-';
        document.getElementById('detailDepartment')!.textContent = user.department || '-';

        const reasonLabelEl = document.querySelector('#detailReason')!.previousElementSibling as HTMLElement;
        const reasonValueEl = document.getElementById('detailReason')!;

        if (user.verification_status === 'rejected') {
            reasonLabelEl.textContent = '취소 이유';
            reasonValueEl.textContent = user.reject_reason || '-';
        } else {
            reasonLabelEl.textContent = '신청 이유';
            reasonValueEl.textContent = user.reason || '-';
        }

        const rejectSection = document.getElementById('rejectReasonSection')!;
        const rejectInput = document.getElementById('rejectReasonInput') as HTMLTextAreaElement;
        rejectSection.style.display = 'none';
        rejectInput.value = '';

        const actionsContainer = document.getElementById('modalActions')!;
        if (user.verification_status === 'temp_verified') {
            actionsContainer.innerHTML = `
                <button class="btn btn-secondary" id="actionClose">닫기</button>
                <button class="btn btn-reject" id="actionShowReject">취소</button>
                <button class="btn btn-approve" id="actionApprove">확정</button>
            `;
        } else if (user.verification_status === 'verified') {
            actionsContainer.innerHTML = `
                <button class="btn btn-secondary" id="actionClose">닫기</button>
                <button class="btn btn-revoke" id="actionRevoke">임시인증으로 되돌리기</button>
            `;
        } else {
            actionsContainer.innerHTML = `
                <button class="btn btn-secondary" id="actionClose">닫기</button>
            `;
        }

        document.getElementById('actionClose')?.addEventListener('click', () => this.closeModal());
        document.getElementById('actionApprove')?.addEventListener('click', () => this.approveUser(user.id));
        document.getElementById('actionShowReject')?.addEventListener('click', () => {
            rejectSection.style.display = 'block';
            actionsContainer.innerHTML = `
                <button class="btn btn-secondary" id="actionCancelReject">취소 사유 입력 취소</button>
                <button class="btn btn-reject" id="actionConfirmReject">취소 확정</button>
            `;
            document.getElementById('actionCancelReject')?.addEventListener('click', () => this.showUserDetail(user));
            document.getElementById('actionConfirmReject')?.addEventListener('click', () => this.rejectUser(user.id));
        });
        document.getElementById('actionRevoke')?.addEventListener('click', () => this.revokeUser(user.id));

        document.getElementById('userDetailModal')!.classList.add('open');
    }

    private closeModal() {
        document.getElementById('userDetailModal')!.classList.remove('open');
    }

    private async approveUser(userId: string) {
        if (!confirm('임시 인증을 관리자 인증으로 승인하시겠습니까?')) return;

        try {
            const { actions } = await import('astro:actions');
            const result = await actions.approveVerification({
                adminId: this.currentUser.id,
                targetUserId: userId,
            });

            if (result.error) throw new Error(result.error.message);

            const { data: profile } = await supabase
                .from('profiles')
                .select('society, classification')
                .eq('id', userId)
                .single();
            const societyMap: Record<string, string> = {
                nuclear_medicine: '대한핵의학회',
                technology: '대한핵의학기술학회',
            };
            const societyName = profile ? societyMap[profile.society] || profile.society || '-' : '-';
            const classification = profile?.classification || '-';

            await supabase.from('notifications').insert({
                user_id: userId,
                sender_id: this.currentUser.id,
                type: 'verification_approved',
                priority: 'high',
                title: '✅ 인증이 최종 승인되었습니다',
                message: `인증 요청이 관리자에 의해 최종 승인되었습니다.\n\n${societyName} ${classification}으로 등록되었습니다.`,
                link: '/mypage',
                action_label: '프로필 확인',
                action_url: '/mypage',
                expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });

            alert('✅ 관리자 인증 처리가 완료되었습니다.');
            this.closeModal();
            this.loadUsers(this.currentStatus);
        } catch (err) {
            console.error('Approve Error:', err);
            alert('❌ 오류가 발생했습니다: ' + (err as Error).message);
        }
    }

    private async rejectUser(userId: string) {
        const rejectInput = document.getElementById('rejectReasonInput') as HTMLInputElement;
        const note = rejectInput?.value.trim() || '';
        if (!note) {
            alert('취소 사유를 입력해야 합니다.');
            rejectInput?.focus();
            return;
        }

        if (!confirm('이 사용자를 미인증으로 처리하시겠습니까?')) return;

        try {
            const { actions } = await import('astro:actions');
            const result = await actions.rejectVerification({
                adminId: this.currentUser.id,
                targetUserId: userId,
                reason: note,
            });

            if (result.error) throw new Error(result.error.message);

            await supabase.from('notifications').insert({
                user_id: userId,
                sender_id: this.currentUser.id,
                type: 'verification_rejected',
                priority: 'high',
                title: '❌ 인증이 취소되었습니다',
                message: `관리자 검토 결과 인증이 취소되었습니다.\n\n사유: ${note}\n\n정보를 수정하여 다시 신청해주시기 바랍니다.`,
                link: '/mypage',
            });

            alert('✅ 미인증 처리 및 알림 전송이 완료되었습니다.');
            this.closeModal();
            this.loadUsers(this.currentStatus);
        } catch (err) {
            console.error('Reject Error:', err);
            alert('❌ 오류가 발생했습니다: ' + (err as Error).message);
        }
    }

    private async revokeUser(userId: string) {
        if (!confirm('승인된 인증을 임시 인증으로 되돌리시겠습니까?')) return;

        try {
            const { actions } = await import('astro:actions');
            const result = await actions.revokeVerification({
                adminId: this.currentUser.id,
                targetUserId: userId,
            });

            if (result.error) throw new Error(result.error.message);

            await supabase.from('notifications').insert({
                user_id: userId,
                sender_id: this.currentUser.id,
                type: 'verification',
                title: '⚠️ 인증 상태 변경',
                message: `관리자 인증이 임시 인증으로 되돌려졌습니다. 재검토가 필요합니다.`,
                link: '/mypage',
            });

            alert('✅ 임시 인증으로 변경되었습니다.');
            this.closeModal();
            this.loadUsers(this.currentStatus);
        } catch (err) {
            console.error('Revoke Error:', err);
            alert('❌ 오류가 발생했습니다: ' + (err as Error).message);
        }
    }

    public async updateCounts() {
        const statuses = ['temp_verified', 'verified', 'list', 'rejected', 'none'];
        for (const status of statuses) {
            let countQuery = supabase
                .from('profiles')
                .select('*', { count: 'exact', head: true })
                .eq('verification_status', status);

            if (status !== 'none') {
                countQuery = countQuery.not('society_email', 'is', null);
            }

            const { count } = await countQuery;
            const countEl = document.getElementById(`${status}Count`);
            if (countEl) {
                countEl.textContent = String(count || 0);
            }
        }
    }
}
