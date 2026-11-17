'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import withAuth from '../../../components/withAuth';
import { CRITICAL_ACTIVITIES, GAS_TYPES, durationText } from '@/lib/ptwForm';

const THEMES = {
  COLD_WORK: {
    title: 'General Work Permit',
    subtitle: 'Izin Kerja Umum',
    color: '#005BAA',
    textOnColor: '#FFFFFF',
    matrixRows: [['General Work (Biru)', 'Wajib', 'Wajib', 'Opsional', 'Wajib*', 'Opsional']],
    notes: [
      'Prosedur pekerjaan untuk General Work wajib ada untuk ditinjau AA dan SC, opsional untuk dilampirkan di Permit Pack',
      'Opsional: sesuai penilaian PA, AA, dan SC',
      'Pekerjaan yang wajib izin kerja harus dilengkapi dengan Rencana Pertolongan Pertama pada Kecelakaan (RP3K)',
      'Pekerjaan bekerja di ketinggian, penggalian, dan confined space entry wajib memiliki rescue plan',
      'Pekerjaan lifting harus memiliki lifting plan',
      'Pekerjaan confined space entry wajib memiliki Confined Space Entry Permit',
    ],
  },
  HOT_WORK_FLAME: {
    title: 'Hot Work Permit',
    subtitle: 'Izin Kerja Pekerjaan Panas',
    color: '#C00000',
    textOnColor: '#FFFFFF',
    matrixRows: [['Hot Work (Merah)', 'Wajib', 'Wajib', 'Wajib', 'Wajib', 'Wajib']],
    notes: [
      'Opsional: sesuai penilaian PA, AA, dan SC',
      'Pekerjaan yang wajib izin kerja harus dilengkapi dengan Rencana Pertolongan Pertama pada Kecelakaan (RP3K)',
      'Pekerjaan bekerja di ketinggian, penggalian, dan confined space entry wajib memiliki rescue plan',
      'Pekerjaan lifting harus memiliki lifting plan',
      'Pekerjaan confined space entry wajib memiliki Confined Space Entry Permit',
    ],
  },
  HOT_WORK_SPARK: {
    title: 'Critical Work Permit',
    subtitle: 'Izin Kerja Pekerjaan Kritis',
    color: '#FFC000',
    textOnColor: '#000000',
    matrixRows: [
      ['Working at height', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Wajib'],
      ['Critical lift', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Wajib'],
      ['Ground disturbance', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Wajib'],
      ['Diving operation', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Opsional'],
      ['Working with live/high risk electrical', 'Wajib', 'Wajib', 'Wajib', 'Wajib', 'Opsional'],
      ['Pekerjaan radioaktif', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Opsional'],
      ['Abrasive blasting', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Opsional'],
      ['Over the side work', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Opsional'],
      ['Working on pressurized system', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Opsional'],
      ['Bekerja dgn peledak', 'Wajib', 'Wajib', 'Opsional', 'Wajib', 'Opsional'],
    ],
    notes: [
      'Opsional: sesuai penilaian PA, AA, dan SC',
      'Pekerjaan yang wajib izin kerja harus dilengkapi dengan Rencana Pertolongan Pertama pada Kecelakaan (RP3K)',
      'Pekerjaan bekerja di ketinggian, penggalian, dan confined space entry wajib memiliki rescue plan',
      'Pekerjaan lifting harus memiliki lifting plan',
      'Pekerjaan confined space entry wajib memiliki Confined Space Entry Permit',
    ],
  },
  COLD_WORK_BREAKING: {
    title: 'Breaking Containment Permit',
    subtitle: 'Izin Kerja Pekerjaan Membuka Containment',
    color: '#000000',
    textOnColor: '#FFFFFF',
    matrixRows: [['Breaking Containment (Hitam)', 'Wajib', 'Wajib', 'Wajib', 'Wajib', 'Wajib']],
    notes: [
      'Opsional: sesuai penilaian PA, AA, dan SC',
      "Dokumen pendukung ICC menjadi 'Wajib' di aktifitas yang masuk kategori complex isolation",
      'Pekerjaan yang wajib izin kerja harus dilengkapi dengan Rencana Pertolongan Pertama pada Kecelakaan (RP3K)',
      'Pekerjaan bekerja di ketinggian, penggalian, dan confined space entry wajib memiliki rescue plan',
      'Pekerjaan lifting harus memiliki lifting plan',
      'Pekerjaan confined space entry wajib memiliki Confined Space Entry Permit',
    ],
  },
};

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtTime = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};

const Check = ({ checked }) => (
  <span style={{
    display: 'inline-block', width: 10, height: 10, border: '1px solid #000',
    textAlign: 'center', lineHeight: '9px', fontSize: 8, fontWeight: 'bold', marginRight: 3,
    verticalAlign: 'middle',
  }}>{checked ? 'X' : ''}</span>
);

const Fill = ({ value, width = 80 }) => (
  <span style={{
    display: 'inline-block', minWidth: width, borderBottom: '1px solid #000',
    padding: '0 3px', fontWeight: 'bold', fontSize: 8,
  }}>{value || '\u00A0'}</span>
);

const cell = { border: '1px solid #000', padding: '1px 3px', fontSize: 8, verticalAlign: 'top' };
const th = { ...cell, fontWeight: 'bold', background: '#F2F2F2', textAlign: 'center' };
const plain = { border: 'none', padding: '1px 2px', fontSize: 8 };

function PermitPrint() {
  const { id } = useParams();
  const [permit, setPermit] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/permit-planning/${id}`)
      .then((r) => r.json())
      .then((result) => {
        if (!result.success) {
          setError(result.message || 'Permit tidak ditemukan');
          return;
        }

        let viewer = null;
        try {
          viewer = JSON.parse(localStorage.getItem('user') || 'null');
        } catch {}
        const canPrint = viewer?.role === 'PA'
          && Number(viewer.id) === result.data.userId
          && ['FULLY_APPROVED', 'ACTIVE', 'COMPLETED'].includes(result.data.status);
        if (!canPrint) {
          setError('Permit hanya dapat dicetak oleh PA pemilik setelah approval AA dan SC selesai.');
          return;
        }

        setPermit(result.data);
      })
      .catch(() => setError('Gagal memuat data permit'));
  }, [id]);

  if (error) return <div style={{ padding: 40, fontFamily: 'Arial' }}>{error}</div>;
  if (!permit) return <div style={{ padding: 40, fontFamily: 'Arial' }}>Memuat...</div>;

  const theme = THEMES[permit.workType] || THEMES.COLD_WORK;

  let docs = {};
  try {
    docs = typeof permit.relatedDocuments === 'string'
      ? JSON.parse(permit.relatedDocuments || '{}')
      : (permit.relatedDocuments || {});
  } catch { docs = {}; }

  let gas = {};
  try {
    gas = typeof permit.gasMeasurement === 'string'
      ? JSON.parse(permit.gasMeasurement || '{}')
      : (permit.gasMeasurement || {});
  } catch { gas = {}; }

  const docNum = (key) => (docs[key]?.checked ? docs[key].number || 'v' : '');
  const docLeft = [
    ['ra', 'Risk Assessment (RA)'], ['jsa', 'JSA'], ['icc', 'ICC'], ['csep', 'CSEP'],
    ['sdiSldkb', 'SDS/LDKB'], ['swc', 'SWC'], ['other', 'Lain-lain (sebutkan)'],
  ];
  const docRight = [
    ['workProcedure', 'Prosedur kerja'], ['excavationCert', 'Excavation certificate'],
    ['liftingPlan', 'Lifting plan'], ['rp3k', 'RP3K'], ['gasTestRecord', 'Gas test record'],
    ['dispensasi', 'Persetujuan dispensasi'],
  ];

  const hasGasData = gas && (gas.initial !== undefined || gas.gases);
  const yesNo = (v) => (
    <span>
      {' '}<Check checked={v === true} /> Ya
      <span style={{ marginLeft: 8 }}><Check checked={hasGasData && v === false} /></span> Tidak
    </span>
  );

  const aaDate = permit.aaApprovedAt;
  const scDate = permit.scApprovedAt;
  const zone = permit.zone || '';
  const loc = (permit.workLocation || '').trim();
  const locationText = !loc
    ? [permit.areaName, zone].filter(Boolean).join(' - ')
    : zone && loc !== zone && !loc.includes(zone)
      ? `${loc} (${zone})`
      : loc;

  const criticalSelected = new Set(gas.criticalActivities || []);
  const signRow = (name, date) => (
    <table style={{ marginTop: 3, width: '100%' }}><tbody><tr>
      <td style={plain}>Nama : <Fill value={name} width={70} /></td>
      <td style={plain}>Tanda tangan :</td>
      <td style={plain}>Tanggal : <Fill value={date ? fmtDate(date) : ''} width={52} /></td>
      <td style={plain}>Waktu : <Fill value={date ? fmtTime(date) : ''} width={36} /></td>
    </tr></tbody></table>
  );

  return (
    <>
      <style>{`
        @page { size: A3 portrait; margin: 8mm; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; color: #111; }
        .sheet {
          width: 900px; margin: 12px auto; border: 3px solid ${theme.color};
          padding: 8px 10px 6px; background: #fff; box-sizing: border-box;
        }
        .sheet-title { color: ${theme.color}; font-size: 18px; font-weight: bold; margin: 0; line-height: 1.1; }
        .sheet-subtitle { color: ${theme.color}; font-size: 12px; font-style: italic; margin: 0; }
        .sec-title { font-size: 9px; font-weight: bold; margin: 6px 0 2px; }
        .cols { display: flex; gap: 8px; align-items: flex-start; }
        .col { flex: 1; min-width: 0; }
        table { border-collapse: collapse; width: 100%; }
        .hint { font-size: 11px; margin: 8px auto; width: 900px; color: #333; }
        .print-btn {
          position: fixed; top: 12px; right: 12px; z-index: 99; padding: 10px 18px;
          background: ${theme.color}; color: ${theme.textOnColor}; border: none;
          border-radius: 8px; font-size: 14px; cursor: pointer;
        }
        @media print {
          .no-print { display: none !important; }
          .sheet { width: 100%; margin: 0; page-break-after: always; border-width: 2.5px; }
          .sheet:last-child { page-break-after: auto; }
        }
      `}</style>

      <button className="print-btn no-print" onClick={() => window.print()}>Print</button>
      <p className="hint no-print">
        Cetak di kertas A3 portrait, dua halaman. Halaman 1 dipasang di tempat kerja, halaman 2 adalah permit pack, gas test, dan toolbox talk.
        Bagian tanda tangan basah dikosongkan.
      </p>

      <div className="sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
          <div>
            <p className="sheet-title">{theme.title}</p>
            <p className="sheet-subtitle">{theme.subtitle}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <img
              src="/images/pertamina-logo.png"
              alt="Pertamina"
              style={{ display: 'block', width: 112, height: 28, objectFit: 'contain' }}
            />
            <div style={{ color: '#C00000', fontSize: 7, fontWeight: 'bold' }}>HULU ENERGI</div>
            <div style={{ fontSize: 8, marginTop: 3 }}>
              Permit Number: <span style={{ fontStyle: 'italic' }}>(diisi oleh PTWC)</span>
            </div>
            <div style={{ border: '1.5px solid #000', padding: '2px 8px', fontWeight: 'bold', fontSize: 11, marginTop: 2, minWidth: 140 }}>
              {permit.permitNumber || '\u00A0'}
            </div>
          </div>
        </div>

        <div className="cols">
          <div className="col">
            <p className="sec-title">1. Deskripsi pekerjaan (diisi oleh PA)</p>
            {permit.workType === 'HOT_WORK_SPARK' && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1px 10px', marginBottom: 3 }}>
                {CRITICAL_ACTIVITIES.map((activity) => (
                  <span key={activity.key} style={{ fontSize: 8, width: '31%' }}>
                    <Check checked={criticalSelected.has(activity.key)} /> {activity.label}
                    {activity.key === 'other' && gas.criticalOther ? `: ${gas.criticalOther}` : ''}
                  </span>
                ))}
              </div>
            )}
            <table><tbody>
              <tr>
                <td style={cell}>Tanggal rencana pekerjaan : <Fill value={fmtDate(permit.startDate)} width={72} /></td>
                <td style={cell}>Durasi pekerjaan : <Fill value={durationText(permit.startDate, permit.endDate)} width={78} /></td>
              </tr>
              <tr>
                <td style={cell}>Identitas/no. peralatan : <Fill value={permit.equipmentIdentity} width={90} /></td>
                <td style={cell}>Lokasi kerja : <Fill value={locationText} width={110} /></td>
              </tr>
              <tr>
                <td style={cell} colSpan={2}>
                  Deskripsi pekerjaan : <b>{permit.workDescription}</b>
                  <div style={{ marginTop: 2 }}>
                    Simple isolation : <Check checked={permit.simpleIsolation} />
                    <span style={{ marginLeft: 16 }}>Sanction to test : <Check checked={permit.sanctionToTest} /></span>
                  </div>
                </td>
              </tr>
              <tr>
                <td style={cell} colSpan={2}>
                  Saya, <b>PA</b>, telah mengisi deskripsi pekerjaan dan menyiapkan dokumen permit pack yang dibutuhkan.
                  <table style={{ marginTop: 2 }}><tbody><tr>
                    <td style={plain}>Diminta oleh : <Fill value={permit.performingAuthority} width={90} /></td>
                    <td style={plain}>Perusahaan : <Fill value={permit.company} width={90} /></td>
                    <td style={plain}>Tanda tangan :</td>
                  </tr></tbody></table>
                </td>
              </tr>
            </tbody></table>

            <p className="sec-title">2. Dokumen permit pack (diisi oleh PA dan ditinjau oleh AA)</p>
            <div className="cols">
              <div className="col">
                <table><tbody>
                  {docLeft.map(([key, label]) => (
                    <tr key={key}>
                      <td style={{ ...cell, width: 16, textAlign: 'center' }}><Check checked={!!docs[key]?.checked} /></td>
                      <td style={cell}>
                        {label}
                        {key === 'other' && docs.other?.number ? <Fill value={docs.other.number} width={70} /> : null}
                      </td>
                    </tr>
                  ))}
                </tbody></table>
              </div>
              <div className="col">
                <table><tbody>
                  {docRight.map(([key, label]) => (
                    <tr key={key}>
                      <td style={{ ...cell, width: 16, textAlign: 'center' }}><Check checked={!!docs[key]?.checked} /></td>
                      <td style={cell}>{label}</td>
                    </tr>
                  ))}
                </tbody></table>
                <table style={{ marginTop: 3 }}><tbody>
                  <tr><td style={th}>Tipe</td><td style={th}>No. PTW/Sertifikat/Dokumen</td></tr>
                  <tr><td style={cell}>PTW</td><td style={{ ...cell, fontWeight: 'bold' }}>{permit.permitNumber}</td></tr>
                  <tr><td style={cell}>ICC</td><td style={cell}>{docNum('icc')}</td></tr>
                  <tr><td style={cell}>RA</td><td style={cell}>{docNum('ra')}</td></tr>
                  <tr><td style={cell}>JSA</td><td style={cell}>{docNum('jsa')}</td></tr>
                  <tr><td style={cell}>Prosedur kerja</td><td style={cell}>{docNum('workProcedure')}</td></tr>
                  <tr><td style={cell}>Lain-lain</td><td style={cell}>{docNum('other')}</td></tr>
                </tbody></table>
              </div>
            </div>
            <table style={{ marginTop: 3 }}><tbody>
              <tr><td style={cell}>
                Pengukuran gas:<br />
                <span style={{ paddingLeft: 10 }}>Pengukuran gas awal/initial gas testing {yesNo(gas.initial)}</span><br />
                <span style={{ paddingLeft: 10 }}>Pengukuran gas kontinu {yesNo(gas.continuous)}</span><br />
                <span style={{ paddingLeft: 10 }}>
                  Pengukuran gas periodik setiap <Fill value={gas.periodic ? gas.periodicInterval : ''} width={24} /> jam {yesNo(gas.periodic)}
                </span><br />
                Pengukuran gas yang diperlukan: {GAS_TYPES.map((gasType) => (
                  <span key={gasType.key} style={{ marginRight: 6 }}>
                    <Check checked={!!gas.gases?.[gasType.key]} /> {gasType.label}
                  </span>
                ))}
                <span><Check checked={!!gas.otherGas} /> {gas.otherGas || '...'}</span>
              </td></tr>
              <tr><td style={cell}>
                Saya, <b>AA</b>, telah meninjau dan menyatakan bahwa lingkup pekerjaan dideskripsikan dengan jelas di dalam izin kerja
                dan dokumentasi permit pack yang diperlukan telah diidentifikasi dan dilengkapi oleh PA.
                {signRow(permit.aaApprover?.name, aaDate)}
              </td></tr>
            </tbody></table>

            <p className="sec-title">3. Tinjauan dan otorisasi (diisi oleh AAA* dan SC)</p>
            <table><tbody>
              <tr><td style={cell}>
                Saya, <b>AAA*</b>, menyatakan bahwa rencana pekerjaan terkait telah dikaji ulang dan memastikan bahwa pekerjaan
                dapat dilaksanakan dan tidak akan mengganggu lokasi kerja di bawah pengawasan saya (<i>jika ada pekerjaan terdampak</i>).
                {signRow(permit.areaAuthority, aaDate)}
              </td></tr>
              <tr><td style={cell}>
                Saya, <b>SC</b>, menyatakan bahwa lingkup pekerjaan telah direncanakan, operasi simultan telah dipertimbangkan,
                pekerjaan dapat dilakukan jika persyaratan izin kerja telah dipenuhi.<br />
                Pekerjaan masuk kategori Remote Mode Condition:
                <Check checked={gas.remoteMode === true} /> Ya
                <span style={{ marginLeft: 8 }}><Check checked={gas.remoteMode === false} /> Tidak</span>
                {signRow(permit.scApprover?.name || permit.siteControllerName, scDate)}
                Catatan SC : {permit.scComments || ''}
              </td></tr>
            </tbody></table>
          </div>

          <div className="col">
            <p className="sec-title">4. Penerbitan dan penerimaan (diisi oleh AA dan PA)</p>
            <table><tbody>
              <tr><td style={cell}>
                Saya, <b>AA</b>, menyatakan bahwa persyaratan izin kerja telah terpenuhi, pekerjaan dapat dilakukan sesuai rencana,
                dan menerbitkan izin kerja. <i>Zero energy/integrity test (jika ada) telah didemonstrasikan oleh PA.</i><br />
                Penerbitan izin tidak mengurangi kewajiban PA untuk selalu mengikuti persyaratan izin kerja.<br />
                Delegasi Remote Mode Condition (RMC): <Check /> Ya, Nama: <Fill width={60} /> <Check /> Tidak<br />
                <span style={{ fontSize: 7 }}>
                  Pendelegasian RMC (jika ada) tidak menghilangkan kewajiban AA untuk memastikan penyediaan tempat kerja yang selamat sesuai persyaratan izin kerja yang disepakati.
                </span>
                {signRow('', null)}
              </td></tr>
              <tr><td style={cell}>
                Saya, <b>PA</b>, menyatakan telah membaca dan memahami semua persyaratan izin kerja. Saya akan memastikan tim kerja saya telah membaca, memahami, dan mengikuti persyaratan izin kerja. Saya akan melakukan pengawasan terhadap pelaksanaan pekerjaan dan segera memberitahu AA jika kondisi tidak selamat/aman.
                <br />Menerima delegasi Remote Mode Condition (RMC): <Check /> Ya <span style={{ marginLeft: 8 }}><Check /> Tidak</span>
                {signRow(permit.performingAuthority, null)}
              </td></tr>
            </tbody></table>

            <p className="sec-title">5. Pengembalian dan penerbitan kembali (Re)/Extension (Ext)</p>
            <table>
              <thead>
                <tr>
                  <th style={th} colSpan={2}>Reissued</th>
                  <th style={th} colSpan={4}>Tanda tangan</th>
                  <th style={th} colSpan={2}>Return</th>
                </tr>
                <tr>
                  <th style={th}>Tgl / waktu</th><th style={th}>Re / Ext</th>
                  <th style={th}>PA</th><th style={th}>AA</th><th style={th}>AAA*</th><th style={th}>SC</th>
                  <th style={th}>Tgl / waktu</th><th style={th}>PA / AA</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(5)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((__, j) => <td key={j} style={{ ...cell, height: 16 }} />)}</tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 7, margin: '2px 0 0' }}>
              1. Return PTW ditandatangani oleh PA dan AA. 2. Reissued PTW ditandatangani oleh PA, AA, AAA*, dan SC. Tidak berlaku untuk RMC.
              3. Persetujuan SC dalam proses reissued PTW dapat disesuaikan dengan strategi implementasi.
              4. Extension PTW ditandatangani oleh PA, AA, dan SC dengan maksimal penambahan 4 jam.
            </p>

            <p className="sec-title">6. Pembatalan atau penutupan (diisi oleh PA dan AA)</p>
            <table><tbody><tr><td style={cell}>
              Saya, <b>PA</b>, menyatakan bahwa semua personel sudah ditarik, lokasi kerja ditinggalkan dalam keadaan bersih dan semua peralatan kerja dalam keadaan selamat.<br />
              Status pekerjaan:
              <span style={{ marginLeft: 6 }}><Check /> Pekerjaan selesai</span>
              <span style={{ marginLeft: 6 }}><Check /> Pekerjaan belum selesai</span><br />
              <span style={{ marginLeft: 12 }}><Check /> Periode PTW berakhir</span>
              <span style={{ marginLeft: 6 }}><Check /> Alasan lain: <Fill width={70} /></span>
              {signRow('', null)}
              Saya, <b>AA</b>, telah memeriksa dan memastikan area kerja ditinggalkan dalam kondisi selamat/aman dan bersih.
              {signRow('', null)}
            </td></tr></tbody></table>

            <p className="sec-title">7. Pencatatan penyelesaian (diisi oleh PTWC)</p>
            <table><tbody><tr><td style={cell}>
              Saya, <b>PTWC</b>, telah memastikan semua copy PTW ini dan semua sertifikat pendukungnya telah disimpan dalam arsip.
              Pencatatan status pekerjaan telah dilakukan pada daftar PTW.
              {signRow('', null)}
            </td></tr></tbody></table>
          </div>
        </div>
        <p style={{ textAlign: 'right', fontSize: 8, fontStyle: 'italic', margin: '4px 0 0' }}>
          Lembar 1. Dipasang di tempat kerja
        </p>
      </div>

      <div className="sheet">
        <div className="cols">
          <div className="col">
            <p className="sec-title">Matriks Persyaratan Permit Pack</p>
            <table>
              <thead>
                <tr>
                  {['Pekerjaan', 'Izin Kerja', 'JSA', 'ICC', 'Prosedur Pekerjaan', 'Daftar Periksa'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {theme.matrixRows.map((row, i) => (
                  <tr key={i}>{row.map((c, j) => <td key={j} style={cell}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 7, margin: '3px 0' }}>
              <b>Keterangan:</b><br />
              {theme.notes.map((note) => <span key={note}>• {note}<br /></span>)}
            </p>

            <p className="sec-title">Pencatatan Penangguhan/Suspension PTW</p>
            <table>
              <thead>
                <tr>
                  <th style={th} colSpan={4}>Berhenti</th>
                  <th style={th} colSpan={4}>Mulai Kembali</th>
                </tr>
                <tr>
                  {['Tanggal', 'Waktu', 'Alasan Penangguhan', 'Nama dan Tanda Tangan Inisiator', 'Tanggal', 'Waktu', 'Tanda Tangan PA', 'Tanda Tangan AA'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i}>{[...Array(8)].map((__, j) => <td key={j} style={{ ...cell, height: 16 }} />)}</tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 7, margin: '2px 0' }}>
              Pekerjaan yang ditangguhkan baru boleh dimulai kembali setelah alasan penangguhan telah ditangani PA dan diverifikasi AA.
            </p>

            <p className="sec-title">Gas Testing Record</p>
            <table>
              <thead>
                <tr>
                  {['Batasan yang Diizinkan', 'H₂S', 'CO', 'Benzene', 'Toluene', 'SO₂', 'NO₂', 'NH₃', 'LEL (%) Hot Work', 'O₂ (%vol)'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={cell}>TWA</td><td style={cell}>1</td><td style={cell}>25</td><td style={cell}>0.5</td><td style={cell}>20</td><td style={cell}>2</td><td style={cell}>0.2</td><td style={cell}>25</td>
                  <td style={{ ...cell, textAlign: 'center' }} rowSpan={3}>{'<10'}</td>
                  <td style={{ ...cell, textAlign: 'center' }} rowSpan={3}>19.5-23.5</td>
                </tr>
                <tr>
                  <td style={cell}>STEL</td><td style={cell}>5</td><td style={cell}>200</td><td style={cell}>2.5</td><td style={cell}>150</td><td style={cell}>5</td><td style={cell}>1</td><td style={cell}>35</td>
                </tr>
                <tr>
                  <td style={cell}>Ceiling</td><td style={cell}>20</td><td style={cell}>-</td><td style={cell}>-</td><td style={cell}>300</td><td style={cell}>-</td><td style={cell}>5</td><td style={cell}>-</td>
                </tr>
              </tbody>
            </table>
            <table style={{ marginTop: 2 }}>
              <thead>
                <tr>
                  {['Tanggal', 'Waktu', 'SN GD', 'Valid kalibrasi', 'LEL (%LEL)', 'O₂ (%vol)', 'H₂S (ppm)', 'CO (ppm)', 'Other', 'Nama AGT', 'Tanda Tangan AGT'].map((h) => (
                    <th key={h} style={th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(11)].map((__, j) => <td key={j} style={{ ...cell, height: 14 }} />)}</tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 7, margin: '2px 0' }}>
              • Kolom valid kalibrasi diisi tanggal jatuh tempo kalibrasi selanjutnya<br />
              • Bump test record harus tersedia onsite<br />
              • Lakukan monitoring gas kontinu ketika hasil pengukuran O₂, flammable, atau toksik gas melebihi batas yang diizinkan<br />
              • SN GD (Serial Number Gas Detector)
            </p>
          </div>

          <div className="col">
            <p className="sec-title">Deklarasi dan Presensi Tool Box Talk (TBT)</p>
            <p style={{ fontSize: 7, margin: '2px 0 4px' }}>
              PA dan seluruh anggota tim kerja pada permit ini harus menandatangani tabel deklarasi dan presensi sebelum memulai pekerjaan
              untuk membuktikan bahwa pekerja telah meninjau permit pack bersama dengan PA. Setiap pekerja memahami lingkup pekerjaan,
              tugas dan tanggung jawabnya, serta kompeten untuk melakukan perannya sesuai yang ada di dalam permit pack.
              Jika pekerja melihat kondisi tidak selamat/aman, lakukan SWA, beritahu rekan kerja, amankan tempat kerja, dan laporkan ke PA.
              Materi pembahasan TBT mengacu ke Panduan TBT pada TKO Penerapan Izin Kerja (Permit to Work).
              Catatan: tabel diisi oleh pekerja di setiap pergantian shift kerja.
            </p>
            <table>
              <thead>
                <tr><th style={th}>Nama</th><th style={th} colSpan={6}>Tanggal dan paraf</th></tr>
              </thead>
              <tbody>
                {[...Array(18)].map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, height: 16, width: '34%' }}>{i === 0 ? permit.performingAuthority || '' : ''}</td>
                    {[...Array(6)].map((__, j) => <td key={j} style={cell} />)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}

export default withAuth(PermitPrint);
