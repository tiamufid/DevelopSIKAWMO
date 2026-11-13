const fs = require('fs');
const path = 'app/components/PermitPlanningForm.js';
const lines = fs.readFileSync(path, 'utf8').split('\n');

// Replace lines 713..1017 (1-based inclusive) — the old Related Documents section
const startIdx = 712; // line 713
const endIdx = 1017;  // line 1017 (exclusive slice end)

const newSection = `        {/* Related Documents Permit */}
        <div className="bg-tertiary/30 p-6 rounded-xl border border-primary/20">
          <h3 className="text-lg font-semibold text-quaternary mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            2. Dokumen Permit Pack (diisi oleh PA dan ditinjau oleh AA)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
            {DOCUMENT_TYPES.map((doc) => (
              <div key={doc.key} className="flex items-start gap-3">
                <div className="flex items-center pt-1">
                  <input
                    type="checkbox"
                    id={doc.key}
                    checked={formData.relatedDocuments[doc.key]?.checked || false}
                    onChange={(e) =>
                      handleRelatedDocumentChange(doc.key, "checked", e.target.checked)
                    }
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label
                    htmlFor={doc.key}
                    className="block text-sm font-medium text-quaternary mb-1 cursor-pointer"
                  >
                    {doc.label}
                  </label>
                  {formData.relatedDocuments[doc.key]?.checked && (
                    <div>
                      <input
                        type="text"
                        placeholder={doc.placeholder}
                        value={formData.relatedDocuments[doc.key]?.number || ""}
                        onChange={(e) =>
                          handleRelatedDocumentChange(doc.key, "number", e.target.value)
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                      />
                      {errors[\`relatedDocuments.\${doc.key}\`] && (
                        <p className="text-red-500 text-sm mt-1">
                          {errors[\`relatedDocuments.\${doc.key}\`]}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>`;

const result = [
  ...lines.slice(0, startIdx),
  ...newSection.split('\n'),
  ...lines.slice(endIdx),
];

fs.writeFileSync(path, result.join('\n'));
console.log('Replaced. New line count:', result.length);
