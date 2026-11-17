import { useState, useEffect } from "react";

function DocumentCheck({
  doc,
  checked,
  number,
  error,
  required = false,
  onCheck,
  onNumber,
  readOnlyNumber = false,
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex items-center pt-1">
        <input
          type="checkbox"
          id={doc.key}
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
        />
      </div>
      <div className="flex-1">
        <label htmlFor={doc.key} className="block text-sm font-medium text-quaternary mb-1 cursor-pointer">
          {doc.label}{required ? " *" : ""}
        </label>
        {checked && (
          <div>
            {readOnlyNumber ? (
              <p className="text-xs text-gray-500 bg-gray-50 border border-gray-200 rounded-md px-3 py-2">
                {number || "Nomor dokumen akan diisi oleh PTWC setelah permit diserahkan."}
              </p>
            ) : (
              <input
                type="text"
                placeholder={doc.placeholder}
                value={number}
                onChange={(e) => onNumber(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            )}
            {errors.criticalActivities && (
              <p className="mt-2 text-sm text-red-600">{errors.criticalActivities}</p>
            )}
          </div>
        )}
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    </div>
  );
}
import Input from "./Input";
import Button from "./Button";
import SitePlotVisualization from "./SitePlotVisualization";
import NotificationToast from "./NotificationToast";
import {
  AREA_HIERARCHY,
  getAreaList,
  getFacilitiesByArea,
  getDecksByFacility,
  getLayout,
  formatLocationPath,
  parseLocationFromPermit
} from "@/lib/areaHierarchy";
import {
  CRITICAL_ACTIVITIES,
  GAS_TYPES,
  DOC_LEFT,
  DOC_RIGHT,
  DOC_EXTRA,
  DOCUMENT_TYPES,
  emptyGasMeasurement,
  normalizeGasMeasurement,
  durationText,
} from "@/lib/ptwForm";

export default function PermitPlanningForm({
  onSubmitSuccess,
  editData = null,
  initialWorkType = "",
  onCancel,
  showNotification,
}) {
  const [formData, setFormData] = useState({
    permitNumber: "",
    areaName: "ORF",
    workType: "",
    workDescription: "",
    workLocation: "", // Add workLocation field
    zone: "",
    coordinates: "",
    startDate: "",
    endDate: "",
    performingAuthority: "",
    company: "",
    areaAuthority: "",
    siteControllerName: "",
    equipmentIdentity: "",
    simpleIsolation: false,
    sanctionToTest: false,
    gasMeasurement: emptyGasMeasurement(),
    status: "DRAFT",
    relatedDocuments: {
      ra: { checked: false, number: "" },
      jsa: { checked: false, number: "" },
      icc: { checked: false, number: "" },
      csep: { checked: false, number: "" },
      sdiSldkb: { checked: false, number: "" },
      swc: { checked: false, number: "" },
      workProcedure: { checked: false, number: "" },
      excavationCert: { checked: false, number: "" },
      liftingPlan: { checked: false, number: "" },
      rp3k: { checked: false, number: "" },
      gasTestRecord: { checked: false, number: "" },
      dispensasi: { checked: false, number: "" },
      tkiTko: { checked: false, number: "" },
      other: { checked: false, number: "" },
    },
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submittingForApproval, setSubmittingForApproval] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");
      setCurrentUser(userData);
      if (userData?.role === "PA" && !formData.performingAuthority && !editData) {
        setFormData((prev) => ({
          ...prev,
          performingAuthority: userData.name || "Performing Authority",
        }));
      }
    } catch (error) {
      console.error("Error reading user from localStorage:", error);
    }
  }, [editData]);

  const isPA = currentUser?.role === "PA";
  const isPTWCReview = currentUser?.role === "PTWC" && editData?.status === "PENDING_PTWC";

  useEffect(() => {
    if (!editData && initialWorkType) {
      setFormData((prev) => ({ ...prev, workType: initialWorkType }));
    }
  }, [editData, initialWorkType]);

  // Hierarchical location state (Area -> Facility -> Deck)
  const [selectedArea, setSelectedArea] = useState("ORF");
  const [selectedFacility, setSelectedFacility] = useState("ORF");
  const [selectedDeck, setSelectedDeck] = useState("DEFAULT");

  const handleAreaChange = (newAreaId) => {
    setSelectedArea(newAreaId);
    const facilities = getFacilitiesByArea(newAreaId);
    const firstFac = facilities[0]?.id || "DEFAULT";
    setSelectedFacility(firstFac);

    const decks = getDecksByFacility(newAreaId, firstFac);
    const firstDeck = decks[0]?.id || "DEFAULT";
    setSelectedDeck(firstDeck);

    const formattedLoc = formatLocationPath(newAreaId, firstFac, firstDeck);
    setFormData((prev) => ({
      ...prev,
      areaName: newAreaId,
      workLocation: formattedLoc,
    }));
  };

  const handleFacilityChange = (newFacId) => {
    setSelectedFacility(newFacId);
    const decks = getDecksByFacility(selectedArea, newFacId);
    const firstDeck = decks[0]?.id || "DEFAULT";
    setSelectedDeck(firstDeck);

    const formattedLoc = formatLocationPath(selectedArea, newFacId, firstDeck);
    setFormData((prev) => ({
      ...prev,
      workLocation: formattedLoc,
    }));
  };

  const handleDeckChange = (newDeckId) => {
    setSelectedDeck(newDeckId);
    const formattedLoc = formatLocationPath(selectedArea, selectedFacility, newDeckId);
    setFormData((prev) => ({
      ...prev,
      workLocation: formattedLoc,
    }));
  };

  const currentLayout = getLayout(selectedArea, selectedFacility, selectedDeck);
  const availableFacilities = getFacilitiesByArea(selectedArea);
  const availableDecks = getDecksByFacility(selectedArea, selectedFacility);

  // Zone definitions
  const zones = [
    { code: "PRC", name: "Processing/Production Area" },
    { code: "UTL", name: "Utilities Area" },
    { code: "BLD", name: "Building/Office Area" },
    { code: "GMS", name: "Gas Metering Station" },
    { code: "CCR", name: "Central Control Room" },
    { code: "OY", name: "Open Yard" },
    { code: "NBL", name: "New Building" },
    { code: "WS", name: "Workshop/Warehouse" },
  ];

  const workTypes = [
    { value: "COLD_WORK", label: "General Work", color: "blue" },
    {
      value: "COLD_WORK_BREAKING",
      label: "Breaking Containment",
      color: "black",
    },
    {
      value: "HOT_WORK_SPARK",
      label: "Critical Work",
      color: "yellow",
    },
    { value: "HOT_WORK_FLAME", label: "Hot Work", color: "red" },
  ];

  const requiredDocumentKeys = new Set(formData.workType ? ["ra", "jsa"] : []);
  if (formData.workType === "COLD_WORK") {
    requiredDocumentKeys.add("workProcedure");
  } else if (formData.workType === "COLD_WORK_BREAKING") {
    ["icc", "workProcedure", "swc"].forEach((key) => requiredDocumentKeys.add(key));
  } else if (formData.workType === "HOT_WORK_FLAME") {
    ["icc", "workProcedure", "swc"].forEach((key) => requiredDocumentKeys.add(key));
  } else if (formData.workType === "HOT_WORK_SPARK") {
    requiredDocumentKeys.add("workProcedure");
    const activities = formData.gasMeasurement.criticalActivities || [];
    if (activities.includes("live_electrical")) requiredDocumentKeys.add("icc");
    if (activities.some((key) => ["working_at_height", "critical_lift", "ground_disturbance"].includes(key))) {
      requiredDocumentKeys.add("swc");
    }
  }

  // Checklist dokumen mengikuti dua kolom lembar PTW.

  // Function to normalize coordinates to "x,y" format
  const normalizeCoordinates = (coords) => {
    if (!coords) return "";
    
    // If already in "x,y" or "x;y" format, convert to "x,y"
    if (typeof coords === "string") {
      if (coords.includes(",") || coords.includes(";")) {
        const separator = coords.includes(",") ? "," : ";";
        const [x, y] = coords.split(separator);
        const xNum = parseFloat(x?.trim());
        const yNum = parseFloat(y?.trim());
        if (!isNaN(xNum) && !isNaN(yNum)) {
          return `${xNum},${yNum}`;
        }
      }
      
      // Try to parse as JSON
      try {
        const parsed = JSON.parse(coords);
        if (parsed.x !== undefined && parsed.y !== undefined) {
          return `${parsed.x},${parsed.y}`;
        }
      } catch {
        // Not JSON, return as is
        return coords;
      }
    }
    
    // If it's an object with x,y properties
    if (typeof coords === "object" && coords.x !== undefined && coords.y !== undefined) {
      return `${coords.x},${coords.y}`;
    }
    
    return "";
  };

  useEffect(() => {
    if (editData) {
      console.log("Edit data received:", editData);

      const locInfo = parseLocationFromPermit(editData);
      setSelectedArea(locInfo.areaId || "ORF");
      setSelectedFacility(locInfo.facilityId || "DEFAULT");
      setSelectedDeck(locInfo.deckId || "DEFAULT");

      // Parse relatedDocuments if it's a string (from database)
      const emptyDocuments = {};
      DOCUMENT_TYPES.forEach((doc) => {
        emptyDocuments[doc.key] = { checked: false, number: "" };
      });
      let parsedRelatedDocuments = emptyDocuments;

      if (editData.relatedDocuments) {
        try {
          let rawData;
          if (typeof editData.relatedDocuments === "string") {
            rawData = JSON.parse(editData.relatedDocuments);
          } else {
            rawData = editData.relatedDocuments;
          }
          
          // Handle backward compatibility - map old field names to new ones
          const fieldMapping = {
            'l2ra': 'ra', // L2RA becomes Risk Assessment (RA)
            'confineSpace': 'csep' // confineSpace becomes CSEP
          };
          
          // Map old data to new structure
          Object.keys(rawData).forEach(key => {
            const newKey = fieldMapping[key] || key;
            if (parsedRelatedDocuments[newKey] !== undefined) {
              parsedRelatedDocuments[newKey] = rawData[key];
            }
          });
          
          console.log("Parsed relatedDocuments:", parsedRelatedDocuments);
        } catch (error) {
          console.error("Error parsing relatedDocuments:", error);
          // Use default values if parsing fails
        }
      }

      setFormData({
        ...editData,
        permitNumber: editData.permitNumber || "",
        areaName: editData.areaName || "ORF",
        workType: editData.workType || "",
        workDescription: editData.workDescription || "",
        workLocation: editData.workLocation || "",
        zone: editData.zone || "",
        startDate: editData.startDate ? editData.startDate.split("T")[0] : "",
        endDate: editData.endDate ? editData.endDate.split("T")[0] : "",
        coordinates: normalizeCoordinates(editData.coordinates),
        performingAuthority: editData.performingAuthority || "",
        company: editData.company || "",
        areaAuthority: editData.areaAuthority || "",
        siteControllerName: editData.siteControllerName || "",
        equipmentIdentity: editData.equipmentIdentity || "",
        simpleIsolation: editData.simpleIsolation || false,
        sanctionToTest: editData.sanctionToTest || false,
        gasMeasurement: normalizeGasMeasurement(editData.gasMeasurement),
        status: editData.status || "DRAFT",
        relatedDocuments: parsedRelatedDocuments,
      });

      console.log("Form data set for editing");
    }
  }, [editData]);

  // Auto-set endDate based on work type if not already set
  useEffect(() => {
    if (
      formData.startDate &&
      formData.workType &&
      !formData.endDate
    ) {
      const startDate = new Date(formData.startDate);
      let validDays = 7; // default

      // Adjust based on work type
      if (
        formData.workType === "HOT_WORK_SPARK" ||
        formData.workType === "HOT_WORK_FLAME"
      )
        validDays = Math.min(validDays, 1);
      else if (formData.workType === "COLD_WORK_BREAKING")
        validDays = Math.min(validDays, 1);

      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + validDays);

      setFormData((prev) => ({
        ...prev,
        endDate: endDate.toISOString().split("T")[0],
      }));
    }
  }, [formData.startDate, formData.workType]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleGasMeasurementChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      gasMeasurement: { ...prev.gasMeasurement, [field]: value },
    }));
  };

  const handleGasTypeChange = (gas, checked) => {
    setFormData((prev) => ({
      ...prev,
      gasMeasurement: {
        ...prev.gasMeasurement,
        gases: { ...prev.gasMeasurement.gases, [gas]: checked },
      },
    }));
  };

  const toggleCriticalActivity = (key) => {
    setFormData((prev) => {
      const current = prev.gasMeasurement.criticalActivities || [];
      const next = current.includes(key)
        ? current.filter((item) => item !== key)
        : [...current, key];
      return {
        ...prev,
        gasMeasurement: { ...prev.gasMeasurement, criticalActivities: next },
      };
    });
  };

  const handleRelatedDocumentChange = (docType, field, value) => {
    setFormData((prev) => ({
      ...prev,
      relatedDocuments: {
        ...prev.relatedDocuments,
        [docType]: {
          ...prev.relatedDocuments[docType],
          [field]: value,
        },
      },
    }));
  };

  const validateCoordinates = (coords) => {
    if (!coords) return false;

    // Support multiple formats: "x,y", "x;y", or JSON
    if (coords.includes(",") || coords.includes(";")) {
      const separator = coords.includes(",") ? "," : ";";
      const [x, y] = coords.split(separator);
      const xNum = parseFloat(x?.trim());
      const yNum = parseFloat(y?.trim());
      return (
        !isNaN(xNum) &&
        !isNaN(yNum) &&
        xNum >= 0 &&
        xNum <= 100 &&
        yNum >= 0 &&
        yNum <= 100
      );
    }

    try {
      const parsed = JSON.parse(coords);
      return (
        parsed.x !== undefined &&
        parsed.y !== undefined &&
        !isNaN(parsed.x) &&
        !isNaN(parsed.y)
      );
    } catch {
      return false;
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Get userId from localStorage for validation
    let userData = null;
    let userId = null;

    try {
      userData = JSON.parse(localStorage.getItem("user") || "{}");
      userId = userData.id;
    } catch (error) {
      console.error("Error parsing user data from localStorage:", error);
    }

    if (!isPA && !formData.permitNumber) newErrors.permitNumber = "Permit number is required";
    if (!formData.workType) newErrors.workType = "Work type is required";
    if (
      formData.workType === "HOT_WORK_SPARK"
      && !(formData.gasMeasurement.criticalActivities || []).length
    ) {
      newErrors.criticalActivities = "Pilih minimal satu jenis aktivitas kritis.";
    }
    if (!formData.workDescription)
      newErrors.workDescription = "Work description is required";
    if (!formData.zone) newErrors.zone = "Work location (zone) is required";
    if (!formData.startDate) newErrors.startDate = "Start date is required";
    if (!formData.endDate) newErrors.endDate = "End date is required";
    if (!userId || userId === "undefined")
      newErrors.userId = "User ID is required. Please login again.";
    if (!formData.performingAuthority)
      newErrors.performingAuthority = "Performing Authority is required";
    if (!formData.company) newErrors.company = "Company is required";
    if (!formData.areaAuthority)
      newErrors.areaAuthority = "Area Authority is required";
    if (!formData.siteControllerName)
      newErrors.siteControllerName = "Site Controller name is required";

    if (formData.coordinates && !validateCoordinates(formData.coordinates)) {
      newErrors.coordinates =
        'Invalid coordinates format. Use "x,y" or "x;y" (0-100 range)';
    }

    if (
      formData.endDate &&
      formData.startDate &&
      new Date(formData.endDate) <= new Date(formData.startDate)
    ) {
      newErrors.endDate = "End date must be after start date";
    }

    // Validate related documents - if checked, number/title is required
    Object.keys(formData.relatedDocuments).forEach((docType) => {
      const doc = formData.relatedDocuments[docType];
      if (requiredDocumentKeys.has(docType) && !doc.checked) {
        newErrors[`relatedDocuments.${docType}`] = "Dokumen ini wajib untuk jenis permit yang dipilih.";
      }
      const numberAssignedByPTWC = isPA && ["ra", "jsa"].includes(docType);
      if (doc.checked && !doc.number.trim() && !numberAssignedByPTWC) {
        newErrors[`relatedDocuments.${docType}`] =
          "Document number/title is required when checked";
      }
    });

    return newErrors;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      console.log("Validation errors:", validationErrors);
      return;
    }

    setLoading(true);

    try {
      const userData = JSON.parse(localStorage.getItem("user") || "{}");

      if (!userData.id) {
        setErrors({ submit: "User not logged in. Please login again." });
        setLoading(false);
        return;
      }

      const submitData = {
        ...formData,
        areaName: selectedArea,
        workLocation: formData.workLocation || formatLocationPath(selectedArea, selectedFacility, selectedDeck),
        userId: userData.id,
        startDate: new Date(formData.startDate).toISOString(),
        endDate: new Date(formData.endDate).toISOString(),
      };

      console.log("Submitting data:", submitData);

      const url = editData
        ? `/api/permit-planning/${editData.id}`
        : "/api/permit-planning";

      const method = editData ? "PUT" : "POST";

      console.log(`Making ${method} request to ${url}`);

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(submitData),
      });

      const result = await response.json();
      console.log("Response:", result);

      if (result.success) {
        if (onSubmitSuccess) {
          onSubmitSuccess(result.data);
        }

        if (!editData) {
          // Reset form for new entries
          setSelectedArea("ORF");
          setSelectedFacility("ORF");
          setSelectedDeck("DEFAULT");
          setFormData({
            permitNumber: "",
            areaName: "ORF",
            workType: "",
            workDescription: "",
            workLocation: "",
            zone: "",
            coordinates: "",
            startDate: "",
            endDate: "",
            performingAuthority: "",
            company: "",
            areaAuthority: "",
            siteControllerName: "",
            equipmentIdentity: "",
            simpleIsolation: false,
            sanctionToTest: false,
            gasMeasurement: emptyGasMeasurement(),
            status: "DRAFT",
            relatedDocuments: {
              ra: { checked: false, number: "" },
              jsa: { checked: false, number: "" },
              icc: { checked: false, number: "" },
              csep: { checked: false, number: "" },
              sdiSldkb: { checked: false, number: "" },
              swc: { checked: false, number: "" },
              workProcedure: { checked: false, number: "" },
              excavationCert: { checked: false, number: "" },
              liftingPlan: { checked: false, number: "" },
              rp3k: { checked: false, number: "" },
              gasTestRecord: { checked: false, number: "" },
              dispensasi: { checked: false, number: "" },
              tkiTko: { checked: false, number: "" },
              other: { checked: false, number: "" },
            },
          });
        }

        setErrors({});
      } else {
        console.error("Submission failed:", result);
        setErrors({ submit: result.message || "Failed to save permit" });
      }
    } catch (error) {
      console.error("Error submitting permit:", error);
      setErrors({ submit: "Failed to save permit. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  // Submit permit for approval
  const handleSubmitForApproval = async (permitId) => {
    setSubmittingForApproval(true);
    try {
      const user = JSON.parse(localStorage.getItem("user"));
      if (!user) {
        setErrors({ submit: "User not logged in. Please login again." });
        return;
      }

      const validationErrors = validateForm();
      if (Object.keys(validationErrors).length > 0) {
        setErrors(validationErrors);
        return;
      }

      const isUserPA = user.role === "PA";
      if (isPTWCReview) {
        const saveResponse = await fetch(`/api/permit-planning/${permitId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formData,
            areaName: selectedArea,
            workLocation: formData.workLocation || formatLocationPath(selectedArea, selectedFacility, selectedDeck),
            userId: user.id,
            startDate: new Date(formData.startDate).toISOString(),
            endDate: new Date(formData.endDate).toISOString(),
          }),
        });
        const saveResult = await saveResponse.json();
        if (!saveResult.success) {
          setErrors({ submit: saveResult.message || "Gagal menyimpan data permit." });
          return;
        }
      }

      const endpoint = isUserPA
        ? `/api/permit-planning/${permitId}/submit-to-ptwc`
        : `/api/permit-planning/${permitId}/submit`;

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.id }),
      });

      const result = await response.json();

      if (result.success) {
        setNotification({
          show: true,
          message: isUserPA
            ? "Permit submitted to PTWC successfully!"
            : "Permit submitted for AA approval successfully!",
          type: "success"
        });
        if (onSubmitSuccess) {
          onSubmitSuccess(result.data);
        }
      } else {
        setErrors({ submit: result.message || "Failed to submit permit" });
      }
    } catch (error) {
      console.error("Error submitting permit:", error);
      setErrors({ submit: "Failed to submit permit. Please try again." });
    } finally {
      setSubmittingForApproval(false);
    }
  };

  const handleMapClick = (coordinates) => {
    const locPath = formatLocationPath(selectedArea, selectedFacility, selectedDeck);
    setFormData((prev) => ({
      ...prev,
      coordinates: `${coordinates.x},${coordinates.y}`,
      areaName: selectedArea,
      workLocation: locPath,
    }));

    // Show brief success feedback using notification system
    if (coordinates.type === "coordinate" && showNotification) {
      showNotification(
        `✓ Koordinat (${coordinates.x.toFixed(1)}, ${coordinates.y.toFixed(1)}) disimpan pada ${locPath}`,
        "success"
      );
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-quaternary flex items-center">
          <svg className="w-7 h-7 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {editData ? "Edit Work Permit" : "Create New Work Permit"}
        </h2>
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Cancel
          </Button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Deskripsi pekerjaan — kolom yang tercetak di lembar 1 */}
        <div className="bg-gray-50 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-quaternary mb-1 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            1. Deskripsi pekerjaan (diisi oleh PA)
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Isian bagian ini tercetak pada kotak yang sama di lembar izin kerja.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {isPA ? (
            <div className="rounded-md border border-primary/20 bg-white p-3">
              <p className="text-sm font-medium text-quaternary">Jenis izin kerja</p>
              <p className="mt-1 font-semibold text-primary">
                {workTypes.find((type) => type.value === formData.workType)?.label || "Pilih jenis permit"}
              </p>
            </div>
          ) : (
          <div>
            <label className="block text-sm font-medium text-quaternary mb-1">
              Jenis izin kerja *
            </label>
            <select
              name="workType"
              value={formData.workType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              required
            >
              <option value="">Select Work Permit Type</option>
              {workTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label} (pin {type.color})
                </option>
              ))}
            </select>
            {errors.workType && (
              <p className="text-red-500 text-sm mt-1">{errors.workType}</p>
            )}
          </div>
          )}

          {isPA ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
              <p className="text-sm font-medium text-quaternary">Nomor permit</p>
              <p className="mt-1 text-xs text-gray-600">Akan diisi oleh PTWC setelah Anda mengirim permohonan.</p>
            </div>
          ) : (
            <Input
              label="Permit Number *"
              name="permitNumber"
              value={formData.permitNumber}
              onChange={handleChange}
              placeholder="Masukkan nomor permit"
              error={errors.permitNumber}
              required
            />
          )}

        </div>

        {formData.workType === "HOT_WORK_SPARK" && (
          <div className="mt-4 border border-amber-300 bg-amber-50 rounded-lg p-4">
            <p className="text-sm font-semibold text-quaternary mb-2">
              Jenis pekerjaan kritis (centang yang tercetak di lembar kuning)
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {CRITICAL_ACTIVITIES.map((activity) => (
                <label key={activity.key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={(formData.gasMeasurement.criticalActivities || []).includes(activity.key)}
                    onChange={() => toggleCriticalActivity(activity.key)}
                    className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                  />
                  <span className="text-sm text-gray-800">{activity.label}</span>
                </label>
              ))}
            </div>
            {(formData.gasMeasurement.criticalActivities || []).includes("other") && (
              <input
                type="text"
                value={formData.gasMeasurement.criticalOther}
                onChange={(e) => handleGasMeasurementChange("criticalOther", e.target.value)}
                placeholder="Sebutkan pekerjaan lain"
                className="mt-3 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
              />
            )}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input
            label="Tanggal rencana pekerjaan *"
            name="startDate"
            type="date"
            value={formData.startDate}
            onChange={handleChange}
            error={errors.startDate}
            required
          />
          <Input
            label="Sampai tanggal *"
            name="endDate"
            type="date"
            value={formData.endDate}
            onChange={handleChange}
            error={errors.endDate}
            required
          />
          <div>
            <label className="block text-sm font-medium text-quaternary mb-1">
              Durasi pekerjaan
            </label>
            <div className="px-3 py-2 border border-dashed border-gray-300 rounded-md bg-white text-sm text-gray-800 min-h-[42px]">
              {durationText(formData.startDate, formData.endDate) || "Dihitung dari tanggal"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="Identitas / no. peralatan"
            name="equipmentIdentity"
            value={formData.equipmentIdentity}
            onChange={handleChange}
            placeholder="Nomor atau identitas peralatan"
            error={errors.equipmentIdentity}
          />
          <Input
            label="Lokasi kerja"
            name="workLocation"
            value={formData.workLocation}
            onChange={handleChange}
            placeholder="Diisi otomatis dari denah, bisa dilengkapi (contoh: ORF / Compressor Room)"
            error={errors.workLocation}
          />
        </div>

        <div className="mt-4">
          <Input
            label="Deskripsi pekerjaan *"
            name="workDescription"
            value={formData.workDescription}
            onChange={handleChange}
            placeholder="Uraian pekerjaan yang akan tercetak di lembar izin"
            multiline
            rows={3}
            error={errors.workDescription}
            required
          />
        </div>

        <div className="flex flex-wrap gap-6 mt-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="simpleIsolation"
              checked={formData.simpleIsolation}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, simpleIsolation: e.target.checked }))
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-quaternary">Simple isolation</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              name="sanctionToTest"
              checked={formData.sanctionToTest}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sanctionToTest: e.target.checked }))
              }
              className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
            />
            <span className="text-sm font-medium text-quaternary">Sanction to test</span>
          </label>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="Diminta oleh (PA) *"
            name="performingAuthority"
            value={formData.performingAuthority}
            onChange={handleChange}
            placeholder="Nama Performing Authority"
            error={errors.performingAuthority}
            required
          />
          <Input
            label="Perusahaan *"
            name="company"
            value={formData.company}
            onChange={handleChange}
            placeholder="Nama perusahaan"
            error={errors.company}
            required
          />
        </div>
      </div>

        {/* Related Documents Permit */}
        <div className="bg-tertiary/30 p-6 rounded-xl border border-primary/20">
          <h3 className="text-lg font-semibold text-quaternary mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            2. Dokumen Permit Pack (diisi oleh PA dan ditinjau oleh AA)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
            <div className="space-y-3">
              {DOC_LEFT.map((doc) => (
                <DocumentCheck
                  key={doc.key}
                  doc={doc}
                  checked={formData.relatedDocuments[doc.key]?.checked || false}
                  number={formData.relatedDocuments[doc.key]?.number || ""}
                  error={errors[`relatedDocuments.${doc.key}`]}
                  required={requiredDocumentKeys.has(doc.key)}
                  onCheck={(checked) => handleRelatedDocumentChange(doc.key, "checked", checked)}
                  onNumber={(number) => handleRelatedDocumentChange(doc.key, "number", number)}
                  readOnlyNumber={isPA && ["ra", "jsa"].includes(doc.key)}
                />
              ))}
            </div>
            <div className="space-y-3">
              {DOC_RIGHT.map((doc) => (
                <DocumentCheck
                  key={doc.key}
                  doc={doc}
                  checked={formData.relatedDocuments[doc.key]?.checked || false}
                  number={formData.relatedDocuments[doc.key]?.number || ""}
                  error={errors[`relatedDocuments.${doc.key}`]}
                  required={requiredDocumentKeys.has(doc.key)}
                  onCheck={(checked) => handleRelatedDocumentChange(doc.key, "checked", checked)}
                  onNumber={(number) => handleRelatedDocumentChange(doc.key, "number", number)}
                  readOnlyNumber={isPA && ["ra", "jsa"].includes(doc.key)}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-primary/20 space-y-3">
            {DOC_EXTRA.map((doc) => (
              <DocumentCheck
                key={doc.key}
                doc={doc}
                checked={formData.relatedDocuments[doc.key]?.checked || false}
                number={formData.relatedDocuments[doc.key]?.number || ""}
                error={errors[`relatedDocuments.${doc.key}`]}
                required={requiredDocumentKeys.has(doc.key)}
                onCheck={(checked) => handleRelatedDocumentChange(doc.key, "checked", checked)}
                onNumber={(number) => handleRelatedDocumentChange(doc.key, "number", number)}
                readOnlyNumber={isPA && ["ra", "jsa"].includes(doc.key)}
              />
            ))}
          </div>

          <div className="border border-gray-200 rounded-lg p-4 mt-4 bg-white">
            <h4 className="text-sm font-semibold text-quaternary mb-1">Pengukuran gas</h4>
            <p className="text-xs text-gray-500 mb-3">Centang = Ya pada lembar cetak. Kosong = Tidak.</p>
            <div className="flex flex-wrap gap-6 mb-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gasMeasurement.initial}
                  onChange={(e) => handleGasMeasurementChange("initial", e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Pengukuran gas awal / initial gas testing</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gasMeasurement.continuous}
                  onChange={(e) => handleGasMeasurementChange("continuous", e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Pengukuran gas kontinu</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.gasMeasurement.periodic}
                  onChange={(e) => handleGasMeasurementChange("periodic", e.target.checked)}
                  className="w-4 h-4 text-primary border-gray-300 rounded focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Pengukuran gas periodik setiap</span>
                <input
                  type="number"
                  min="1"
                  disabled={!formData.gasMeasurement.periodic}
                  value={formData.gasMeasurement.periodicInterval}
                  onChange={(e) => handleGasMeasurementChange("periodicInterval", e.target.value)}
                  placeholder="jam"
                  className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm disabled:bg-gray-100"
                />
                <span className="text-sm text-gray-700">jam</span>
              </label>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-2">Pengukuran gas yang diperlukan:</p>
              <div className="flex flex-wrap gap-4 items-center">
                {GAS_TYPES.map((gas) => (
                  <label key={gas.key} className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData.gasMeasurement.gases?.[gas.key]}
                      onChange={(e) => handleGasTypeChange(gas.key, e.target.checked)}
                      className="w-3.5 h-3.5 text-primary border-gray-300 rounded focus:ring-primary"
                    />
                    <span className="text-sm text-gray-700">{gas.label}</span>
                  </label>
                ))}
                <label className="flex items-center gap-1.5">
                  <span className="text-sm text-gray-700">Lainnya</span>
                  <input
                    type="text"
                    value={formData.gasMeasurement.otherGas}
                    onChange={(e) => handleGasMeasurementChange("otherGas", e.target.value)}
                    placeholder="sebutkan"
                    className="w-36 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary text-sm"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Location Information */}
        <div className="bg-secondary/10 p-6 rounded-xl border border-secondary/30">
          <h3 className="text-lg font-semibold text-quaternary mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Location Information
          </h3>

          {/* 3-Tier Hierarchical Location Selection (Area -> Facility -> Deck) */}
          <div className="space-y-4 mb-5">
            {/* Tier 1: Area Selection (5 Area) */}
            <div>
              <label className="block text-sm font-semibold text-quaternary mb-2">
                1. Pilih Area Utama PHE WMO *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {getAreaList().map((area) => (
                  <button
                    type="button"
                    key={area.id}
                    onClick={() => handleAreaChange(area.id)}
                    className={`p-3 rounded-xl border-2 text-left transition-all cursor-pointer ${
                      selectedArea === area.id
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-sm ring-2 ring-primary/20"
                        : "border-gray-200 bg-white hover:border-gray-300 text-gray-700"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xl">{area.icon}</span>
                      {selectedArea === area.id && (
                        <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                      )}
                    </div>
                    <div className="text-sm font-bold mt-1.5">{area.name}</div>
                    <p className="text-[11px] text-gray-500 line-clamp-1">{area.fullName}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Tier 2: Facility / Sub-Area Selection (if area has > 1 facility) */}
            {availableFacilities.length > 1 && (
              <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  2. Pilih Fasilitas / Sub-Area di {AREA_HIERARCHY[selectedArea]?.name}:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableFacilities.map((fac) => {
                    const isSelected = selectedFacility === fac.id;
                    return (
                      <button
                        type="button"
                        key={fac.id}
                        onClick={() => handleFacilityChange(fac.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-quaternary text-white shadow-sm ring-2 ring-quaternary/20"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                        }`}
                      >
                        <span>🏢</span>
                        <span>{fac.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tier 3: Deck / Platform Selection (if facility has > 1 deck) */}
            {availableDecks.length > 1 && (
              <div className="bg-white p-3.5 rounded-xl border border-gray-200">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  3. Pilih Deck / Level / Platform:
                </label>
                <div className="flex flex-wrap gap-2">
                  {availableDecks.map((deck) => {
                    const isSelected = selectedDeck === deck.id;
                    return (
                      <button
                        type="button"
                        key={deck.id}
                        onClick={() => handleDeckChange(deck.id)}
                        className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? "bg-secondary text-white shadow-sm ring-2 ring-secondary/20"
                            : "bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200"
                        }`}
                      >
                        <span>📑</span>
                        <span>{deck.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Location Summary Alert */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3.5 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">📍</span>
                <div>
                  <div className="text-xs text-blue-600 font-medium">Lokasi Kerja Terpilih:</div>
                  <div className="text-sm font-bold text-blue-900">
                    {formatLocationPath(selectedArea, selectedFacility, selectedDeck)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 bg-white px-2.5 py-1 rounded-md border border-blue-200">
                Denah: <span className="font-semibold text-gray-800">{currentLayout?.name || "Main Layout"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-quaternary mb-1">
                Work Location (Zone) *
              </label>
              <select
                name="zone"
                value={formData.zone}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                required
              >
                <option value="">Select work location</option>
                {zones.map((zone) => (
                  <option key={zone.code} value={zone.code}>
                    {zone.code} - {zone.name}
                  </option>
                ))}
              </select>
              {errors.zone && (
                <p className="text-red-500 text-sm mt-1">{errors.zone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-quaternary mb-1">
                Coordinates (Optional)
              </label>

              <div className="space-y-3">
                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-3 h-3 bg-primary rounded-full"></div>
                    <span className="text-sm font-medium text-primary">
                      Interactive Map Mode
                    </span>
                  </div>
                  <p className="text-xs text-gray-600">
                    📍 Click anywhere on the site layout map below to set work
                    location coordinates
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    💡 The coordinates will be automatically filled when you
                    click on the map
                  </p>
                </div>

                <Input
                  name="coordinates"
                  value={formData.coordinates}
                  onChange={handleChange}
                  placeholder="Click on map below to set coordinates"
                  error={errors.coordinates}
                />

                <p className="text-xs text-gray-500">
                  Coordinates will be automatically filled when you click on the
                  site layout map below
                </p>
              </div>

              <p className="text-xs text-gray-500 mt-1">
                Format: x,y (range 0-100)
              </p>
            </div>
          </div>
        </div>

        {/* Nama yang tercetak di bagian 3 */}
        <div className="bg-gray-50 p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-quaternary mb-1 flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
            </svg>
            3. Tinjauan dan otorisasi
          </h3>
          <p className="text-xs text-gray-500 mb-4">
            Nama ini tercetak di kolom AAA dan SC. Tanda tangan tetap basah di lembar kerja.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <Input
              label="Nama Area Authority (AAA) *"
              name="areaAuthority"
              value={formData.areaAuthority}
              onChange={handleChange}
              placeholder="Nama yang tercetak di kolom AAA"
              error={errors.areaAuthority}
              required
            />
            <Input
              label="Nama Site Controller (SC) *"
              name="siteControllerName"
              value={formData.siteControllerName}
              onChange={handleChange}
              placeholder="Nama yang tercetak di kolom SC"
              error={errors.siteControllerName}
              required
            />
          </div>

          <div>
            <p className="text-sm font-medium text-quaternary mb-2">
              Pekerjaan masuk kategori Remote Mode Condition
            </p>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="remoteMode"
                  checked={formData.gasMeasurement.remoteMode === true}
                  onChange={() => handleGasMeasurementChange("remoteMode", true)}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Ya</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="remoteMode"
                  checked={formData.gasMeasurement.remoteMode === false}
                  onChange={() => handleGasMeasurementChange("remoteMode", false)}
                  className="w-4 h-4 text-primary border-gray-300 focus:ring-primary"
                />
                <span className="text-sm text-gray-700">Tidak</span>
              </label>
              <button
                type="button"
                onClick={() => handleGasMeasurementChange("remoteMode", null)}
                className="text-xs text-gray-500 underline"
              >
                Kosongkan
              </button>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{errors.submit}</p>
          </div>
        )}

        {errors.userId && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <p className="text-red-600 text-sm">{errors.userId}</p>
          </div>
        )}

        {/* Interactive Site Visualization */}
        <div className="border-t pt-6">
          <h3 className="text-lg font-semibold text-quaternary mb-4">
            🗺️ Site Location Map - Click to Set Coordinates
          </h3>
          <div className="bg-amber-50 border border-amber-200 rounded-md p-3 mb-4">
            <p className="text-sm text-amber-800 font-medium mb-1">
              📌 How to set coordinates:
            </p>
            <p className="text-xs text-amber-700">
              1. Click anywhere on the site layout image below
              <br />
              2. Your coordinates will be automatically filled above
              <br />
              3. You can click multiple times to adjust the location
            </p>
          </div>
          <div className="bg-gray-50 p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary transition-colors">
            <SitePlotVisualization
              onPointClick={handleMapClick}
              selectedZone={formData.zone}
              selectedArea={selectedArea}
              layoutImage={currentLayout?.image}
              showOnlyPermits={false}
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex gap-4 pt-6 border-t border-gray-200">
          <Button 
            type="submit" 
            disabled={loading || submittingForApproval}
            className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Saving...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                {editData ? "Update Permit" : "Create Permit"}
              </>
            )}
          </Button>

          {/* Submit for Approval Button - Only show for DRAFT permits */}
          {editData && (editData.status === 'DRAFT' || isPTWCReview) && (
            <Button 
              type="button" 
              disabled={loading || submittingForApproval}
              onClick={() => handleSubmitForApproval(editData.id)}
              className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white"
            >
              {submittingForApproval ? (
                <>
                  <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Submitting...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {isPA ? "Submit to PTWC" : isPTWCReview ? "Kirim ke AA untuk Approval" : "Submit for Approval"}
                </>
              )}
            </Button>
          )}

          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancel
            </Button>
          )}
        </div>
      </form>

      {/* Notification Toast */}
      <NotificationToast
        notification={notification.show ? notification : null}
        onClose={() => setNotification({ show: false, message: "", type: "" })}
      />
    </div>
  );
}
