'use client';
import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import withAuth from '../../../components/withAuth';

// Theme per work type sesuai warna pin/form PTW
const THEMES = {
  COLD_WORK: {
    title: 'General Work Permit',
    subtitle: 'Izin Kerja Umum',
    color: '#005BAA',
    textOnColor: '#FFFFFF',
    matrixRows: [['General Work (Biru)', 'Wajib', 'Wajib', 'Opsional', 'Wajib*', 'Opsional']],
  },
  HOT_WORK_FLAME: {
    title: 'Hot Work Permit',
    subtitle: 'Izin Kerja Pekerjaan Panas',
    color: '#C00000',
    textOnColor: '#FFFFFF',
    matrixRows: [['Hot Work (Merah)', 'Wajib', 'Wajib', 'Wajib', 'Wajib', 'Wajib']],
  },
  HOT_WORK_SPARK: {
    title: 'Critical Work Permit',
    subtitle: 'Izin Kerja Pekerjaan Kritis',
    color: '#FFC000',
    textOnColor: '#000000',
    criticalActivities: [
      'Working at height', 'Critical lift', 'Ground disturbance', 'Diving operation',
      'Working with live/high risk electrical', 'Pekerjaan radioaktif', 'Abrasive blasting',
      'Over the side work', 'Working on pressurized system', 'Bekerja dgn peledak', 'Lain-lain (sebutkan)'
    ],
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
  },
  COLD_WORK_BREAKING: {
    title: 'Breaking Containment Permit',
    subtitle: 'Izin Kerja Membuka Containment',
    color: '#000000',
    textOnColor: '#FFFFFF',
    matrixRows: [['Breaking Containment (Hitam)', 'Wajib', 'Wajib', 'Wajib', 'Wajib', 'Wajib']],
  },
};

const fmtDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
};
const fmtTime = (d) => {
  if (!d) return '';
  return new Date(d).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
};
const durationText = (start, end) => {
  if (!start || !end) return '';
  const ms = new Date(end) - new Date(start);
  const days = Math.floor(ms / 86400000);
  const hours = Math.floor((ms % 86400000) / 3600000);
  return days > 0 ? `${days} hari ${hours} jam` : `${hours} jam`;
};

// Kotak centang: terisi "X" jika checked
const Check = ({ checked }) => (
  <span style={{
    display: 'inline-block', width: 11, height: 11, border: '1.5px solid #000',
    textAlign: 'center', lineHeight: '10px', fontSize: 9, fontWeight: 'bold', marginRight: 3,
    verticalAlign: 'middle'
  }}>{checked ? 'X' : ''}</span>
);

// Garis isian
const Fill = ({ value, width = 120 }) => (
  <span style={{
    display: 'inline-block', minWidth: width, borderBottom: '1px solid #000',
    padding: '0 4px', fontWeight: 'bold'
  }}>{value || ''}</span>
);

const cell = { border: '1px solid #000', padding: '2px 4px', fontSize: 9, verticalAlign: 'top' };
const th = { ...cell, fontWeight: 'bold', background: '#F2F2F2' };

function PermitPrint() {
  const { id } = useParams();
  const [permit, setPermit] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`/api/permit-planning/${id}`)
      .then(r => r.json())
      .then(result => {
        if (result.success) setPermit(result.data);
        else setError(result.message || 'Permit tidak ditemukan');
      })
      .catch(() => setError('Gagal memuat data permit'));
  }, [id]);

  if (error) return <div style={{ padding: 40, fontFamily: 'Arial' }}>{error}</div>;
  if (!permit) return <div style={{ padding: 40, fontFamily: 'Arial' }}>Memuat...</div>;

  const theme = THEMES[permit.workType] || THEMES.COLD_WORK;

  let docs = {};
  try {
    docs = typeof permit.relatedDocuments === 'string' ? JSON.parse(permit.relatedDocuments || '{}') : (permit.relatedDocuments || {});
  } catch { docs = {}; }
  let gas = {};
  try {
    gas = typeof permit.gasMeasurement === 'string' ? JSON.parse(permit.gasMeasurement || '{}') : (permit.gasMeasurement || {});
  } catch { gas = {}; }
  const docNum = (key) => (docs[key]?.checked ? docs[key].number || 'v' : '');

  const docListLeft = [
    ['ra', 'Risk Assessment (RA)'], ['jsa', 'JSA'], ['icc', 'ICC'], ['csep', 'CSEP'],
    ['sdiSldkb', 'SDS/LDKB'], ['swc', 'SWC'], ['other', 'Lain-lain (sebutkan):'],
  ];
  const docListRight = [
    ['workProcedure', 'Prosedur kerja'], ['excavationCert', 'Excavation certificate'],
    ['liftingPlan', 'Lifting plan'], ['rp3k', 'RP3K'], ['gasTestRecord', 'Gas test record'],
    ['dispensasi', 'Persetujuan dispensasi'],
  ];
  const gasTypes = [['lel', 'LEL'], ['o2', 'O₂'], ['h2s', 'H₂S'], ['co', 'CO'], ['voc', 'VOC'], ['benzene', 'Benzene'], ['so2', 'SO₂'], ['co2', 'CO₂']];

  const hasGasData = !!permit.gasMeasurement;
  const yesNo = (v) => (
    <span>
      {' '}<Check checked={v === true} /> Ya
      <span style={{ marginLeft: 10 }}><Check checked={hasGasData && v === false} /></span> Tidak
    </span>
  );

  const aaDate = permit.aaApprovedAt;
  const scDate = permit.scApprovedAt;
  const locationText = [permit.areaName, permit.zone, permit.workLocation].filter(Boolean).join(' - ');

  return (
    <>
      <style>{`
        @page { size: A4 landscape; margin: 6mm; }
        body { font-family: Arial, Helvetica, sans-serif; margin: 0; }
        .sheet { width: 1060px; margin: 0 auto 16px; border: 2.5px solid ${theme.color}; padding: 10px 14px; background: #fff; }
        .sheet-title { color: ${theme.color}; font-size: 22px; fontWeight: 700; font-weight: bold; margin: 0; }
        .sheet-subtitle { color: ${theme.color}; font-size: 14px; font-style: italic; margin: 0; }
        .sec-title { font-size: 10px; font-weight: bold; margin: 8px 0 3px; }
        .cols { display: flex; gap: 12px; }
        .col { flex: 1; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #000; }
        .print-btn { position: fixed; top: 12px; right: 12px; z-index: 99; padding: 10px 20px; background: ${theme.color}; color: #fff; border: none; border-radius: 8px; font-size: 14px; cursor: pointer; }
        @media print {
          .no-print { display: none !important; }
          .sheet { width: 100%; margin: 0; page-break-after: always; border-width: 2px; }
        }
      `}</style>

      <button className="print-btn no-print" onClick={() => window.print()}>🖨️ Print</button>

      {/* ===================== LEMBAR 1 ===================== */}
      <div className="sheet">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <p className="sheet-title">{theme.title}</p>
            <p className="sheet-subtitle">{theme.subtitle}</p>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ background: theme.color, color: theme.textOnColor, fontWeight: 'bold', fontSize: 13, padding: '6px 18px', display: 'inline-block' }}>
              PERTAMINA<br />HULU ENERGI
            </div>
            <div style={{ fontSize: 10, marginTop: 4 }}>
              Permit Number:<br />
              <span style={{ fontSize: 9, fontStyle: 'italic' }}>(diisi oleh PTWC)</span>
            </div>
            <div style={{ border: '1.5px solid #000', padding: '3px 10px', fontWeight: 'bold', fontSize: 12, marginTop: 2, minWidth: 160 }}>
              {permit.permitNumber}
            </div>
          </div>
        </div>

        {/* Section 1 */}
        <p className="sec-title">1. Deskripsi pekerjaan (diisi oleh PA)</p>
        {theme.criticalActivities && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 18px', margin: '2px 0 4px' }}>
            {theme.criticalActivities.map(a => (
              <span key={a} style={{ fontSize: 9, width: '30%' }}><Check checked={false} /> {a}</span>
            ))}
          </div>
        )}
        <table>
          <tbody>
            <tr>
              <td style={{ ...cell, width: '50%' }}>Tanggal rencana pekerjaan : <Fill value={fmtDate(permit.startDate)} width={90} /></td>
              <td style={cell}>Durasi pekerjaan : <Fill value={durationText(permit.startDate, permit.endDate)} width={110} /></td>
            </tr>
            <tr>
              <td style={cell}>Identitas/no. peralatan : <Fill value={permit.equipmentIdentity} width={140} /></td>
              <td style={cell}>Lokasi kerja : <Fill value={locationText} width={200} /></td>
            </tr>
            <tr>
              <td style={cell} colSpan={2}>
                Deskripsi pekerjaan : <span style={{ fontWeight: 'bold' }}>{permit.workDescription}</span>
                <span style={{ float: 'right' }}>
                  Simple isolation : <Check checked={permit.simpleIsolation} />
                  <span style={{ marginLeft: 24 }}>Sanction to test : <Check checked={permit.sanctionToTest} /></span>
                </span>
              </td>
            </tr>
            <tr>
              <td style={cell} colSpan={2}>
                Saya, <b>PA</b>, telah mengisi deskripsi pekerjaan dan menyiapkan dokumen permit pack yang dibutuhkan.
                <table style={{ marginTop: 4 }}><tbody>
                  <tr>
                    <td style={{ ...cell, border: 'none', padding: 0 }}>Diminta oleh : <Fill value={permit.performingAuthority} width={140} /></td>
                    <td style={{ ...cell, border: 'none', padding: 0 }}>Perusahaan : <Fill value={permit.company} width={140} /></td>
                    <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
                  </tr>
                </tbody></table>
              </td>
            </tr>
          </tbody>
        </table>

        {/* Section 2 */}
        <p className="sec-title">2. Dokumen permit pack (diisi oleh PA dan ditinjau oleh AA)</p>
        <div className="cols">
          <div className="col">
            <table><tbody>
              {docListLeft.map(([key, label]) => (
                <tr key={key}>
                  <td style={{ ...cell, width: 18, textAlign: 'center' }}><Check checked={docs[key]?.checked} /></td>
                  <td style={cell}>{label} {key === 'other' && docs.other?.checked ? <Fill value={docs.other.number} width={120} /> : null}</td>
                </tr>
              ))}
            </tbody></table>
          </div>
          <div className="col">
            <table><tbody>
              {docListRight.map(([key, label]) => (
                <tr key={key}>
                  <td style={{ ...cell, width: 18, textAlign: 'center' }}><Check checked={docs[key]?.checked} /></td>
                  <td style={cell}>{label}</td>
                </tr>
              ))}
              <tr>
                <td style={{ ...cell, border: 'none' }} colSpan={2}>
                  <table style={{ marginTop: 2 }}><tbody>
                    <tr><td style={th}>Tipe</td><td style={th}>No. PTW/Sertifikat/Dokumen</td></tr>
                    <tr><td style={cell}>PTW</td><td style={{ ...cell, fontWeight: 'bold' }}>{permit.permitNumber}</td></tr>
                    <tr><td style={cell}>ICC</td><td style={cell}>{docNum('icc')}</td></tr>
                    <tr><td style={cell}>RA</td><td style={cell}>{docNum('ra')}</td></tr>
                    <tr><td style={cell}>JSA</td><td style={cell}>{docNum('jsa')}</td></tr>
                    <tr><td style={cell}>Prosedur kerja</td><td style={cell}>{docNum('workProcedure')}</td></tr>
                    <tr><td style={cell}>Lain-lain</td><td style={cell}>{docNum('other')}</td></tr>
                  </tbody></table>
                </td>
              </tr>
            </tbody></table>
          </div>
        </div>
        <table style={{ marginTop: 3 }}><tbody>
          <tr>
            <td style={cell}>
              Pengukuran gas:<br />
              <span style={{ paddingLeft: 20 }}>Pengukuran gas awal/initial gas testing {yesNo(gas.initial)}</span><br />
              <span style={{ paddingLeft: 20 }}>Pengukuran gas kontinu {yesNo(gas.continuous)}</span><br />
              <span style={{ paddingLeft: 20 }}>Pengukuran gas periodik setiap <Fill value={gas.periodic ? gas.periodicInterval : ''} width={30} /> jam {yesNo(gas.periodic)}</span><br />
              Pengukuran gas yang diperlukan: {gasTypes.map(([k, l]) => (
                <span key={k} style={{ marginRight: 8 }}><Check checked={gas.gases?.[k]} /> {l}</span>
              ))}
            </td>
          </tr>
          <tr>
            <td style={cell}>
              Saya, <b>AA</b>, telah meninjau dan menyatakan bahwa lingkup pekerjaan dideskripsikan dengan jelas di dalam izin kerja
              dan dokumentasi permit pack yang diperlukan telah diidentifikasi dan dilengkapi oleh PA.
              <table style={{ marginTop: 4 }}><tbody>
                <tr>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : <Fill value={permit.aaApprover?.name} width={130} /></td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : <Fill value={fmtDate(aaDate)} width={70} /></td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : <Fill value={fmtTime(aaDate)} width={50} /></td>
                </tr>
              </tbody></table>
            </td>
          </tr>
        </tbody></table>

        <div className="cols" style={{ marginTop: 4 }}>
          {/* Section 3 */}
          <div className="col">
            <p className="sec-title">3. Tinjauan dan otorisasi (diisi oleh AAA* dan SC)</p>
            <table><tbody>
              <tr><td style={cell}>
                Saya, <b>AAA*</b>, menyatakan bahwa rencana pekerjaan terkait telah dikaji ulang dan memastikan bahwa pekerjaan
                dapat dilaksanakan dan tidak akan mengganggu lokasi pekerjaan di bawah pengawasan saya (<i>jika ada pekerjaan terdampak</i>).
                <table style={{ marginTop: 4 }}><tbody><tr>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : <Fill value={permit.areaAuthority} width={110} /></td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : <Fill value={fmtDate(aaDate)} width={60} /></td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : <Fill value={fmtTime(aaDate)} width={45} /></td>
                </tr></tbody></table>
              </td></tr>
              <tr><td style={cell}>
                Saya, <b>SC</b>, menyatakan bahwa lingkup pekerjaan telah direncanakan, operasi simultan telah dipertimbangkan,
                pekerjaan dapat dilakukan jika persyaratan izin kerja telah dipenuhi.<br />
                Pekerjaan masuk kategori Remote Mode Condition: <Check checked={false} /> Ya <span style={{ marginLeft: 12 }}><Check checked={false} /> Tidak</span>
                <table style={{ marginTop: 4 }}><tbody><tr>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : <Fill value={permit.scApprover?.name} width={110} /></td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : <Fill value={fmtDate(scDate)} width={60} /></td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : <Fill value={fmtTime(scDate)} width={45} /></td>
                </tr></tbody></table>
                Catatan SC : {permit.scComments || ''}
              </td></tr>
            </tbody></table>
          </div>

          <div className="col">
            {/* Section 4 */}
            <p className="sec-title">4. Penerbitan dan penerimaan (diisi oleh AA dan PA)</p>
            <table><tbody>
              <tr><td style={cell}>
                Saya, <b>AA</b>, menyatakan bahwa persyaratan izin kerja telah terpenuhi, pekerjaan dapat dilakukan sesuai rencana,
                dan menerbitkan izin kerja. <i>Zero energy/integrity test (jika ada) telah didemonstrasikan oleh PA.</i><br />
                Penerbitan izin tidak mengurangi kewajiban untuk patuh selalu mengikuti persyaratan izin kerja.<br />
                Delegasi Remote Mode Condition (RMC): <Check checked={false} /> Ya, Nama: <Fill width={70} /> <span style={{ marginLeft: 8 }}><Check checked={false} /> Tidak</span><br />
                <span style={{ fontSize: 8 }}>Pendelegasian RMC (jika ada) tidak menghilangkan kewajiban AA untuk memastikan penyediaan tempat kerja
                yang selamat sesuai persyaratan izin kerja yang disepakati.</span>
                <table style={{ marginTop: 2 }}><tbody><tr>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : </td>
                </tr></tbody></table>
              </td></tr>
              <tr><td style={cell}>
                Saya, <b>PA</b>, menyatakan telah membaca dan memahami semua persyaratan izin kerja. Saya akan memastikan tim kerja
                saya telah membaca, memahami, dan mengikuti persyaratan izin kerja. Saya akan melakukan pengawasan terhadap pelaksanaan
                pekerjaan. Saya akan menghentikan pekerjaan dan segera memberitahu AA jika kondisi tidak selamat/aman, ada bahaya baru,
                ragu terhadap aktivitas yang sedang dilakukan, dan perubahan lingkup pekerjaan. Saya menerima tanggung jawab pelaksanaan
                kerja yang telah ditentukan.<br />
                Menerima delegasi Remote Mode Condition (RMC): <Check checked={false} /> Ya <span style={{ marginLeft: 8 }}><Check checked={false} /> Tidak</span>
                <table style={{ marginTop: 2 }}><tbody><tr>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : <Fill value={permit.performingAuthority} width={80} /></td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : </td>
                  <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : </td>
                </tr></tbody></table>
              </td></tr>
            </tbody></table>

            {/* Section 7 */}
            <p className="sec-title">7. Pencatatan penyelesaian (diisi oleh PTWC)</p>
            <table><tbody><tr><td style={cell}>
              Saya, <b>PTWC</b>, telah memastikan semua copy PTW ini dan semua sertifikat pendukungnya telah disimpan dalam arsip.
              Pencatatan status pekerjaan telah dilakukan pada daftar PTW.
              <table style={{ marginTop: 4 }}><tbody><tr>
                <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : </td>
                <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
                <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : </td>
                <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : </td>
              </tr></tbody></table>
            </td></tr></tbody></table>
          </div>
        </div>

        {/* Section 5 */}
        <p className="sec-title">5. Pengembalian dan penerbitan kembali (diisi oleh PA, AA, AAA*, SC)</p>
        <table>
          <thead>
            <tr>
              <th style={th} rowSpan={2}>Tanggal</th><th style={th} rowSpan={2}>Waktu</th>
              <th style={th} colSpan={2}>Status PTW</th>
              <th style={th} colSpan={4}>Tanda Tangan</th>
              <th style={th} rowSpan={2}>Tanggal</th><th style={th} rowSpan={2}>Waktu</th>
              <th style={th} colSpan={2}>Tanda Tangan</th>
            </tr>
            <tr>
              <th style={th}>Re</th><th style={th}>Ext</th>
              <th style={th}>PA</th><th style={th}>AA</th><th style={th}>AAA*</th><th style={th}>SC</th>
              <th style={th}>PA</th><th style={th}>AA</th>
            </tr>
          </thead>
          <tbody>
            {[...Array(5)].map((_, i) => (
              <tr key={i}>{[...Array(12)].map((_, j) => <td key={j} style={{ ...cell, height: 14 }} />)}</tr>
            ))}
          </tbody>
        </table>
        <p style={{ fontSize: 8, margin: '2px 0' }}>
          1. Return PTW ditandatangani oleh PA dan AA.&nbsp;
          2. Reissued PTW ditandatangani oleh PA, AA, AAA*, dan SC. Tidak berlaku untuk RMC.&nbsp;
          3. Persetujuan SC dalam proses reissued PTW dapat disesuaikan dengan strategi implementasi.&nbsp;
          4. Extension PTW ditandatangani oleh PA, AA, dan SC dengan maksimal penambahan 4 jam.
        </p>

        {/* Section 6 */}
        <p className="sec-title">6. Pembatalan atau penutupan (diisi oleh PA dan AA)</p>
        <table><tbody><tr><td style={cell}>
          Saya, <b>PA</b>, menyatakan bahwa semua personel sudah ditarik, lokasi kerja ditinggalkan dalam keadaan bersih dan semua
          peralatan kerja dalam keadaan selamat.<br />
          Status pekerjaan:<br />
          <span style={{ paddingLeft: 12 }}><Check checked={false} /> Pekerjaan selesai</span>
          <span style={{ paddingLeft: 16 }}><Check checked={false} /> Pekerjaan belum selesai:</span>
          <span style={{ paddingLeft: 16 }}><Check checked={false} /> Periode PTW berakhir</span>
          <span style={{ paddingLeft: 16 }}><Check checked={false} /> Alasan lain: <Fill width={90} /></span>
          <table style={{ marginTop: 2 }}><tbody><tr>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : </td>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : </td>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : </td>
          </tr></tbody></table>
          Saya, <b>AA</b>, telah memeriksa dan memastikan area kerja ditinggalkan dalam kondisi selamat/aman dan bersih.
          <table style={{ marginTop: 2 }}><tbody><tr>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Nama : </td>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Tanda tangan : </td>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Tanggal : </td>
            <td style={{ ...cell, border: 'none', padding: 0 }}>Waktu : </td>
          </tr></tbody></table>
        </td></tr></tbody></table>

        <p style={{ textAlign: 'right', fontSize: 8, fontStyle: 'italic', margin: '3px 0 0' }}>
          Lembar 1. Dipasang di tempat kerja
        </p>
      </div>

      {/* ===================== LEMBAR 2 ===================== */}
      <div className="sheet">
        <div className="cols">
          <div className="col">
            <p className="sec-title">Matriks Persyaratan Permit Pack</p>
            <table>
              <thead>
                <tr>
                  <th style={th}>Pekerjaan</th><th style={th}>Izin Kerja</th><th style={th}>JSA</th>
                  <th style={th}>ICC</th><th style={th}>Prosedur Pekerjaan</th><th style={th}>Daftar Periksa</th>
                </tr>
              </thead>
              <tbody>
                {theme.matrixRows.map((row, i) => (
                  <tr key={i}>{row.map((c, j) => <td key={j} style={{ ...cell, fontWeight: i === 0 && j === 0 ? 'bold' : 'normal' }}>{c}</td>)}</tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 8, margin: '2px 0' }}>
              <b>Keterangan:</b><br />
              * Prosedur pekerjaan untuk General Work wajib ada untuk ditinjau AA dan SC, opsional untuk dilampirkan di Permit Pack<br />
              • Opsional: sesuai penilaian PA, AA, dan SC<br />
              • Pekerjaan yang wajib izin kerja harus dilengkapi dengan Rencana Pertolongan Pertama pada Kecelakaan (RP3K)<br />
              • Pekerjaan bekerja di ketinggian, penggalian, dan <i>confined space entry</i> wajib memiliki <i>rescue plan</i><br />
              • Pekerjaan <i>lifting</i> harus memiliki <i>lifting plan</i><br />
              • Pekerjaan <i>confined space entry</i> wajib memiliki Confined Space Entry Permit.
            </p>

            <p className="sec-title">Pencatatan Penangguhan/Suspension PTW</p>
            <table>
              <thead>
                <tr>
                  <th style={th} colSpan={3}>Berhenti</th><th style={th} colSpan={3}>Mulai Kembali</th>
                </tr>
                <tr>
                  <th style={th}>Tanggal</th><th style={th}>Waktu</th><th style={th}>Alasan Penangguhan</th>
                  <th style={th}>Tanggal</th><th style={th}>Waktu</th>
                  <th style={th}>Tanda Tangan PA</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(3)].map((_, i) => (
                  <tr key={i}>
                    <td style={{ ...cell, height: 16 }} /><td style={cell} /><td style={cell} />
                    <td style={cell} /><td style={cell} /><td style={cell} />
                  </tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 8, margin: '2px 0' }}>
              Pekerjaan yang ditangguhkan baru boleh dimulai kembali setelah alasan penangguhan telah ditangani PA dan diverifikasi AA.
            </p>

            <p className="sec-title">Gas Testing Record</p>
            <table>
              <thead>
                <tr>
                  <th style={th}>Batasan yang Dizinkan</th><th style={th}>H₂S (ppm)</th><th style={th}>CO (ppm)</th>
                  <th style={th}>Benzene (ppm)</th><th style={th}>Toluene (ppm)</th><th style={th}>SO₂ (ppm)</th>
                  <th style={th}>NO₂ (ppm)</th><th style={th}>NH₃ (ppm)</th>
                  <th style={th}>LEL (%) Hot Work</th><th style={th}>O₂ (%vol)</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style={cell}>TWA</td><td style={cell}>1</td><td style={cell}>25</td><td style={cell}>0.5</td><td style={cell}>20</td><td style={cell}>2</td><td style={cell}>0.2</td><td style={cell}>25</td><td style={{ ...cell, textAlign: 'center' }} rowSpan={3}>{'<10'}</td><td style={{ ...cell, textAlign: 'center' }} rowSpan={3}>19.5-23.5</td></tr>
                <tr><td style={cell}>STEL</td><td style={cell}>5</td><td style={cell}>200</td><td style={cell}>2.5</td><td style={cell}>150</td><td style={cell}>5</td><td style={cell}>1</td><td style={cell}>35</td></tr>
                <tr><td style={cell}>Ceiling</td><td style={cell}>20</td><td style={cell}>-</td><td style={cell}>-</td><td style={cell}>300</td><td style={cell}>-</td><td style={cell}>5</td><td style={cell}>-</td></tr>
              </tbody>
            </table>
            <table style={{ marginTop: 2 }}>
              <thead>
                <tr>
                  <th style={th}>Tanggal</th><th style={th}>Waktu</th><th style={th}>SN GD</th>
                  <th style={th}>Valid kalibrasi</th><th style={th}>LEL (%LEL)</th><th style={th}>O₂ (%vol)</th>
                  <th style={th}>H₂S (ppm)</th><th style={th}>CO (ppm)</th><th style={th}>Other:...</th>
                  <th style={th}>Nama AGT</th><th style={th}>Tanda Tangan AGT</th>
                </tr>
              </thead>
              <tbody>
                {[...Array(8)].map((_, i) => (
                  <tr key={i}>{[...Array(11)].map((_, j) => <td key={j} style={{ ...cell, height: 14 }} />)}</tr>
                ))}
              </tbody>
            </table>
            <p style={{ fontSize: 8, margin: '2px 0' }}>
              * Kolom valid kalibrasi diisi tanggal jatuh tempo kalibrasi selanjutnya<br />
              • <i>Bump test record</i> harus tersedia onsite<br />
              • Lakukan monitoring gas kontinu ketika hasil pengukuran O₂, <i>flammable</i>, atau toksik gas melebihi batas yang diizinkan<br />
              • SN GD (Serial Number Gas Detector)
            </p>
          </div>

          <div className="col">
            <p className="sec-title">Deklarasi dan Presensi Tool Box Talk (TBT) :</p>
            <p style={{ fontSize: 8, margin: '2px 0' }}>
              PA dan seluruh anggota tim kerja pada permit ini harus mendatangani tabel deklarasi dan presensi sebelum memulai
              pekerjaan untuk membuktikan bahwa pekerja telah meninjau permit pack bersama dengan PA. Setiap pekerja memahami
              lingkup pekerjaan, tugas dan tanggung jawabnya, serta kompeten untuk melakukan perannya sesuai yang ada di dalam
              permit pack (termasuk kajian risiko, prosedur, dan daftar periksa) untuk menyelesaikan pekerjaan dengan selamat.<br />
              Jika pekerja melihat kondisi tidak selamat/aman, lakukan SWA, bertahu rekan kerja, amankan tempat kerja, dan laporkan
              ke PA. Materi pembahasan TBT mengacu ke Panduan TBT pada TKO Penerapan Izin Kerja (<i>Permit to Work</i>).<br />
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
                    {[...Array(6)].map((_, j) => <td key={j} style={cell} />)}
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
