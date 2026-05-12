// app.jsx — Pupuk Indonesia HR Dashboard main shell

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "palette": "green",
  "density": "comfortable"
}/*EDITMODE-END*/;

const PALETTES = {
  green:   { primary: '#00753E', dark: '#00502B', light: '#5BB587', p50: '#EBF6F0', p100: '#D4ECDF', p200: '#A8D9BF' },
  blue:    { primary: '#0E7AC0', dark: '#0A5A8E', light: '#5BAAD9', p50: '#E8F2FA', p100: '#CFE5F5', p200: '#A5CCEC' },
  neutral: { primary: '#1C252E', dark: '#000000', light: '#637381', p50: '#F4F6F8', p100: '#E4E7EB', p200: '#C4CDD5' },
  amber:   { primary: '#B76E00', dark: '#7A4F00', light: '#FFAB00', p50: '#FFF7E6', p100: '#FFEACC', p200: '#FFD49A' },
};

function applyPalette(name) {
  const p = PALETTES[name] || PALETTES.green;
  const r = document.documentElement.style;
  r.setProperty('--primary', p.primary);
  r.setProperty('--primary-dark', p.dark);
  r.setProperty('--primary-light', p.light);
  r.setProperty('--primary-50', p.p50);
  r.setProperty('--primary-100', p.p100);
  r.setProperty('--primary-200', p.p200);
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [activeView, setActiveView] = React.useState('dashboard');
  const [suratList, setSuratList] = React.useState(SURAT);
  const [openedSurat, setOpenedSurat] = React.useState(null);
  const [flash, setFlash] = React.useState(null);
  const [povUserId, setPovUserId] = React.useState(POV_OPTIONS[0]?.id || CURRENT_USER_ID);
  const [detailContext, setDetailContext] = React.useState(null); // null | 'reviewer'
  React.useEffect(() => { applyPalette(t.palette); }, [t.palette]);

  React.useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 6000);
    return () => clearTimeout(t);
  }, [flash]);

  const handleSubmitSurat = (newSurat) => {
    const pov = POV_OPTIONS.find(p => p.id === povUserId);
    const tagged = { ...newSurat, pembuatId: povUserId, pembuat: pov?.name || newSurat.pembuat };
    setSuratList((prev) => [tagged, ...prev]);
    setActiveView('manajemen-surat');
    setFlash({
      tone: 'success',
      title: 'Surat berhasil disubmit',
      msg: `Surat "${newSurat.judul}" telah dikirim ke reviewer dengan status Menunggu Review.`,
    });
  };

  const handleWithdrawSurat = (id) => {
    setSuratList((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'draft' } : s)));
    setFlash({
      tone: 'info',
      title: 'Surat ditarik kembali',
      msg: 'Surat dikembalikan ke status Draft. Anda dapat mengeditnya kembali sebelum disubmit ulang.',
    });
  };

  const handleReviewerAction = (id, action) => {
    setSuratList((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      if (action === 'approve') {
        const updatedReviewers = (s.reviewers || []).map(r =>
          r.id === povUserId ? { ...r, reviewStatus: 'approved' } : r
        );
        const allApproved = updatedReviewers.every(r => r.reviewStatus === 'approved');
        return { ...s, reviewers: updatedReviewers, status: allApproved ? 'menunggu-approval' : 'menunggu-review' };
      }
      if (action === 'return-drafter') {
        const updatedReviewers = (s.reviewers || []).map(r =>
          r.id === povUserId ? { ...r, reviewStatus: 'returned' } : r
        );
        return { ...s, reviewers: updatedReviewers, status: 'draft' };
      }
      if (action === 'cancel') {
        const updatedReviewers = (s.reviewers || []).map(r =>
          r.id === povUserId ? { ...r, reviewStatus: 'cancelled' } : r
        );
        return { ...s, reviewers: updatedReviewers, status: 'dibatalkan' };
      }
      return s;
    }));
  };

  const handleApproverAction = (id, action) => {
    setSuratList((prev) => prev.map((s) => {
      if (s.id !== id) return s;
      if (action === 'finalize') return { ...s, status: 'disetujui' };
      if (action === 'return')   return { ...s, status: 'menunggu-review' };
      if (action === 'cancel')   return { ...s, status: 'dibatalkan' };
      return s;
    }));
  };

  React.useEffect(() => {
    if (activeView === 'detail-surat' && !openedSurat) setActiveView('manajemen-surat');
  }, [activeView, openedSurat]);

  const trendData = HEADCOUNT_TREND.map(d => d.v);

  const renderContent = () => {
    if (activeView === 'detail-surat' && openedSurat) {
      const isReviewerCtx = detailContext === 'reviewer';
      const isApproverCtx = detailContext === 'approver';
      const handleBackFromDetail = () => {
        setOpenedSurat(null);
        setDetailContext(null);
        setActiveView(isReviewerCtx ? 'reviewer' : isApproverCtx ? 'approver' : 'manajemen-surat');
      };
      const reviewerActionsForSurat = isReviewerCtx ? {
        onApprove: () => { handleReviewerAction(openedSurat.id, 'approve');        handleBackFromDetail(); },
        onReturn:  () => { handleReviewerAction(openedSurat.id, 'return-drafter'); handleBackFromDetail(); },
        onCancel:  () => { handleReviewerAction(openedSurat.id, 'cancel');         handleBackFromDetail(); },
        onSave:    () => { handleBackFromDetail(); },
      } : isApproverCtx ? {
        onApprove: () => { handleApproverAction(openedSurat.id, 'finalize');       handleBackFromDetail(); },
        onReturn:  () => { handleApproverAction(openedSurat.id, 'return');         handleBackFromDetail(); },
        onCancel:  () => { handleApproverAction(openedSurat.id, 'cancel');         handleBackFromDetail(); },
        onSave:    () => { handleBackFromDetail(); },
      } : null;
      return (
        <BuatSuratBaru
          readOnly
          surat={openedSurat}
          onBack={handleBackFromDetail}
          onSubmit={() => {}}
          onWithdraw={isReviewerCtx ? null : handleWithdrawSurat}
          reviewerActions={reviewerActionsForSurat}
        />
      );
    }
    if (activeView === 'buat-surat-baru') {
      return <BuatSuratBaru onBack={() => setActiveView('manajemen-surat')} onSubmit={handleSubmitSurat}/>;
    }
    if (activeView === 'manajemen-surat') {
      const povMeta = POV_OPTIONS.find(p => p.id === povUserId);
      const isDrafter = povMeta?.type === 'drafter';
      const visibleSurat = isDrafter
        ? suratList.filter(s => s.pembuatId === povUserId)
        : suratList;
      return (
        <>
          <div className="page-title">
            <div>
              <h1>Manajemen Surat</h1>
              <div className="crumbs">
                <span>Pupuk Indonesia</span>
                <span className="sep"></span>
                <span>Penciptaan Surat</span>
                <span className="sep"></span>
                <span className="now">Manajemen Surat</span>
              </div>
            </div>
          </div>
          {isDrafter && (
            <div style={{ padding: '12px 16px', background: '#F3EDFF', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start', fontSize: 13, color: '#3F1E8F' }}>
              <Icon name="info" size={16} strokeWidth={2} color="#7635DC" style={{ flexShrink: 0, marginTop: 1 }}/>
              <span>Sebagai <b>Drafter</b>, Anda hanya melihat surat yang Anda buat sendiri. Klik <b>Buat Surat Baru</b> untuk membuat surat baru, atau gunakan tombol <b>Tarik Kembali</b> pada surat yang sudah disubmit jika perlu direvisi.</span>
            </div>
          )}
          {flash && (
            <div className={`flash flash-${flash.tone}`}>
              <span className="flash-ic"><Icon name={flash.tone === 'success' ? 'check' : 'info'} size={16} strokeWidth={2.4}/></span>
              <div className="flash-body">
                <div className="flash-title">{flash.title}</div>
                <div className="flash-msg">{flash.msg}</div>
              </div>
              <button className="flash-x" onClick={() => setFlash(null)} title="Tutup"><Icon name="x" size={14}/></button>
            </div>
          )}
          <SuratTable
            onNav={setActiveView}
            suratList={visibleSurat}
            onWithdraw={handleWithdrawSurat}
            currentUserId={povUserId}
            onOpenLetter={(s) => {
              setOpenedSurat(s);
              const isPendingReviewer = s.status === 'menunggu-review' &&
                (s.reviewers || []).some(r => r.id === povUserId && r.reviewStatus === 'pending');
              const isPendingApprover = s.status === 'menunggu-approval' &&
                (s.approvers || []).some(a => a.id === povUserId);
              setDetailContext(isPendingReviewer ? 'reviewer' : isPendingApprover ? 'approver' : null);
              setActiveView('detail-surat');
            }}
          />
        </>
      );
    }
    if (activeView === 'reviewer') {
      const toReview = suratList.filter(s =>
        s.status === 'menunggu-review' &&
        (s.reviewers || []).some(r => r.id === povUserId && r.reviewStatus === 'pending')
      );
      return (
        <>
          <div className="page-title">
            <div>
              <h1>Reviewer</h1>
              <div className="crumbs">
                <span>Pupuk Indonesia</span><span className="sep"></span>
                <span>Persetujuan Surat</span><span className="sep"></span>
                <span className="now">Reviewer</span>
              </div>
            </div>
          </div>
          <SuratTable
            onNav={setActiveView}
            suratList={toReview}
            onWithdraw={null}
            currentUserId={povUserId}
            onOpenLetter={(s) => {
              setOpenedSurat(s);
              setDetailContext('reviewer');
              setActiveView('detail-surat');
            }}
          />
        </>
      );
    }
    if (activeView === 'approver') {
      const toApprove = suratList.filter(s =>
        s.status === 'menunggu-approval' &&
        (s.approvers || []).some(a => a.id === povUserId)
      );
      return (
        <>
          <div className="page-title">
            <div>
              <h1>Approver</h1>
              <div className="crumbs">
                <span>Pupuk Indonesia</span><span className="sep"></span>
                <span>Persetujuan Surat</span><span className="sep"></span>
                <span className="now">Approver</span>
              </div>
            </div>
          </div>
          <SuratTable
            onNav={setActiveView}
            suratList={toApprove}
            onWithdraw={null}
            currentUserId={povUserId}
            onOpenLetter={(s) => {
              setOpenedSurat(s);
              setDetailContext('approver');
              setActiveView('detail-surat');
            }}
          />
        </>
      );
    }
    if (activeView === 'inbox')           return <InboxPage/>;
    if (activeView === 'notif')           return <NotifikasiPage/>;
    if (activeView === 'profil-saya')     return <ProfilSayaPage/>;
    if (activeView === 'profil-jabatan')  return <ProfilSayaPage/>;
    if (activeView === 'rekap')           return <RekapPage/>;
    if (activeView === 'pencarian')       return <PencarianPage/>;
    if (activeView === 'master-jenis')    return <MasterJenisSuratPage/>;
    if (activeView === 'master-klasif')   return <MasterKlasifikasiPage/>;
    if (activeView === 'master-unit')     return <MasterUnitPage/>;
    if (activeView === 'arsip-a-list' || activeView === 'arsip-a-pinjam')   return <ArsipAktifPage subView={activeView}/>;
    if (activeView === 'arsip-i-list' || activeView === 'arsip-i-musnah')   return <ArsipInaktifPage subView={activeView}/>;
    if (activeView === 'permission')      return <PermissionDocumentPage/>;
    if (activeView === 'rekap-arsip')     return <RekapArsipPage/>;
    // default: dashboard view
    return (
      <>
        <div className="page-title">
          <div>
            <h1>Dashboard HR & SDM</h1>
            <div className="crumbs">
              <span>Pupuk Indonesia</span>
              <span className="sep"></span>
              <span>HR & SDM</span>
              <span className="sep"></span>
              <span className="now">Dashboard</span>
            </div>
          </div>
        </div>

        <WelcomeBanner/>

          {/* KPI Row */}
          <div className="grid-kpi">
            <KpiCard
              icon="users" iconColor="green"
              label="Total Karyawan"
              value={HC_DISPLAY.toLocaleString('id-ID')}
              trend="+5.2%" trendDir="up"
              foot="vs 12,204 bulan lalu"
              sparkData={trendData}
              sparkColor="var(--primary)"
            />
            <KpiCard
              icon="check" iconColor="blue"
              label="Hadir Hari Ini"
              value="11,203"
              trend="87.2%" trendDir="up"
              foot="1,644 cuti / izin / WFH"
              sparkData={[82,85,88,84,87,89,87,88,87,89,86,87]}
              sparkColor="#0095D9"
            />
            <KpiCard
              icon="cal" iconColor="amber"
              label="Cuti Aktif"
              value="248"
              trend="−12.4%" trendDir="down"
              foot="12 menunggu approval"
              sparkData={[280,295,310,302,275,260,248,255,260,250,252,248]}
              sparkColor="#FFAB00"
            />
            <KpiCard
              icon="briefc" iconColor="red"
              label="Lowongan Aktif"
              value="34"
              trend="+8 baru" trendDir="up"
              foot="142 kandidat dalam proses"
              sparkData={[18,22,24,28,26,30,32,29,31,33,35,34]}
              sparkColor="#FF5630"
            />
          </div>

          {/* Headcount trend + Donut */}
          <div className="grid-2-1">
            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Tren Headcount</h3>
                  <p className="card-subtitle">Total karyawan aktif · 12 bulan terakhir</p>
                </div>
                <div className="pills">
                  <button>30 hari</button>
                  <button>6 bulan</button>
                  <button className="on">12 bulan</button>
                  <button>YTD</button>
                </div>
              </div>
              <div className="card-body" style={{ paddingBottom: 8 }}>
                <AreaChart data={HEADCOUNT_TREND} height={260}/>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderTop: '1px dashed var(--border)' }}>
                <div style={{ padding: '20px 24px', borderRight: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tambah Bersih</div>
                  <div style={{ fontFamily: 'Barlow', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }} className="tnum">+667</div>
                  <div style={{ fontSize: 11, color: '#118D57', fontWeight: 700 }}>+5.5% YoY</div>
                </div>
                <div style={{ padding: '20px 24px', borderRight: '1px dashed var(--border)' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Rekrut Baru</div>
                  <div style={{ fontFamily: 'Barlow', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }} className="tnum">582</div>
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>~48 / bulan</div>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Turnover Rate</div>
                  <div style={{ fontFamily: 'Barlow', fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em' }} className="tnum">3.8%</div>
                  <div style={{ fontSize: 11, color: '#118D57', fontWeight: 700 }}>−0.4 pts</div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Distribusi per Anak Perusahaan</h3>
                  <p className="card-subtitle">Sebaran headcount</p>
                </div>
                <button className="icon-btn"><Icon name="dotsV" size={18}/></button>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
                  <Donut data={ANAK_PERUSAHAAN}/>
                </div>
                <div className="legend">
                  {ANAK_PERUSAHAAN.map(a => {
                    const pct = (a.headcount / TOTAL_HEADCOUNT * 100).toFixed(1);
                    return (
                      <div className="legend-row" key={a.id}>
                        <span className="swatch" style={{ background: a.color }}></span>
                        <span className="lbl">{a.name}</span>
                        <span className="pct">{pct}%</span>
                        <span className="cnt">{a.headcount.toLocaleString('id-ID')}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* 3-col row: Hire/Exit · Demografi · Pending Approvals */}
          <div className="grid-3">
            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Rekrut vs Resign</h3>
                  <p className="card-subtitle">6 bulan terakhir</p>
                </div>
              </div>
              <div className="card-body" style={{ paddingBottom: 12 }}>
                <HireExitChart data={HIRE_EXIT}/>
              </div>
              <div style={{ display: 'flex', gap: 16, padding: '12px 24px 20px', fontSize: 12 }}>
                <div className="flex"><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--primary)' }}></span> <span>Rekrut <b className="tnum">582</b></span></div>
                <div className="flex"><span style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--text-disabled)', opacity: 0.55 }}></span> <span>Resign <b className="tnum">224</b></span></div>
              </div>
            </div>

            <div className="card">
              <div className="card-head">
                <div>
                  <h3 className="card-title">Demografi Usia</h3>
                  <p className="card-subtitle">Distribusi karyawan aktif</p>
                </div>
              </div>
              <div className="card-body">
                <div className="demo">
                  {DEMOGRAFI_USIA.map((d, i) => (
                    <div className="demo-row" key={i}>
                      <div className="demo-head">
                        <span className="l">{d.lbl}</span>
                        <span className="r">{d.count.toLocaleString('id-ID')} · {d.pct}%</span>
                      </div>
                      <div className="demo-bar"><div className="fill" style={{ width: `${d.pct * 2.5}%` }}></div></div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 20, padding: '12px 14px', background: 'var(--primary-50)', borderRadius: 12, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, color: 'var(--primary-dark)' }}><Icon name="info" size={16}/></div>
                  <div style={{ fontSize: 12, color: 'var(--primary-dark)', lineHeight: 1.5 }}>
                    Rata-rata usia <b className="tnum">37.4 tahun</b>. 46% karyawan dalam kelompok usia produktif (25-44).
                  </div>
                </div>
              </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
              <div className="card-head">
                <div>
                  <h3 className="card-title">Approval Tertunda</h3>
                  <p className="card-subtitle">{PENDING_APPROVALS.length} pengajuan menunggu</p>
                </div>
                <button className="btn btn-ghost" style={{ fontSize: 12 }}>Lihat Semua <Icon name="chevr" size={14}/></button>
              </div>
              <div>
                {PENDING_APPROVALS.map(a => <ApprovalRow key={a.id} a={a}/>)}
              </div>
            </div>
          </div>

          {/* Upcoming events full width */}
          <div className="card" style={{ overflow: 'hidden' }}>
            <div className="card-head">
              <div>
                <h3 className="card-title">Agenda Mendatang</h3>
                <p className="card-subtitle">Ulang tahun, anniversary, acara, dan pelatihan minggu ini</p>
              </div>
              <div className="pills">
                <button className="on">Semua</button>
                <button>Ultah</button>
                <button>Acara</button>
                <button>Pelatihan</button>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)' }}>
              {UPCOMING.map((u, i) => (
                <div key={u.id} style={{ borderRight: i % 2 === 0 ? '1px dashed var(--border)' : 'none' }}>
                  <UpcomingRow u={u}/>
                </div>
              ))}
              <div style={{ borderTop: '1px dashed var(--border)', padding: '14px 24px', gridColumn: 'span 2', display: 'flex', justifyContent: 'center' }}>
                <button className="btn btn-ghost" style={{ fontSize: 13 }}>Lihat kalender lengkap <Icon name="ext" size={14}/></button>
              </div>
            </div>
          </div>

          {/* Employee table */}
          <EmployeeTable/>
      </>
    );
  };

  const isFocusMode = activeView === 'buat-surat-baru' || activeView === 'detail-surat';

  return (
    <div className={`app ${isFocusMode ? 'focus-mode' : ''}`}>
      {!isFocusMode && <Sidebar activeView={activeView} onNav={setActiveView}/>}
      <main className="main">
        <Topbar/>
        <div className="content">
          {renderContent()}
        </div>
      </main>

      {!isFocusMode && (
        <PovSwitcher povUserId={povUserId} onChange={setPovUserId}/>
      )}

      {!isFocusMode && (
        <TweaksPanel>
          <TweakSection label="Identitas Visual"/>
          <TweakRadio
            label="Palette"
            value={t.palette}
            options={['green', 'blue', 'neutral', 'amber']}
            onChange={(v) => setTweak('palette', v)}
          />
          <div style={{ padding: '0 12px 12px', fontSize: 11, color: '#666', lineHeight: 1.4 }}>
            Hijau = identitas Pupuk Indonesia. Coba alternatif untuk presentasi.
          </div>
        </TweaksPanel>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
