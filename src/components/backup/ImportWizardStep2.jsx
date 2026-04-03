import React, { useEffect } from 'react';
import { ArrowRight, Link, Unlink } from 'lucide-react';
import { autoMatchColumns } from '../../utils/columnMatcher';

const REQUIRED_FIELDS = {
  products: ['name'],
  buyers: ['fullName'],
};

export default function ImportWizardStep2({
  parsedData,
  entityType,
  mapping,
  setMapping,
  onConflict,
  setOnConflict,
  customColumns,
}) {
  const fields = entityType === 'products'
    ? ['name', 'sku', 'barcode', 'category']
    : ['fullName', 'businessName', 'phone', 'email', 'address', 'city'];

  const fieldLabels = {
    name: 'Product Name',
    sku: 'SKU',
    barcode: 'Barcode',
    category: 'Category',
    fullName: 'Full Name',
    businessName: 'Business Name',
    phone: 'Phone',
    email: 'Email',
    address: 'Address',
    city: 'City',
  };

  // Auto-match on first load
  useEffect(() => {
    if (parsedData?.headers && Object.keys(mapping).length === 0) {
      const auto = autoMatchColumns(parsedData.headers, entityType, customColumns);
      setMapping(auto);
    }
  }, [parsedData?.headers]);

  const headers = parsedData?.headers || [];
  const usedHeaders = new Set(Object.values(mapping).filter(Boolean));

  const handleFieldMapping = (field, headerValue) => {
    setMapping((prev) => ({
      ...prev,
      [field]: headerValue || null,
    }));
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-semibold text-[#1E3A5F] mb-1">Map File Columns</h3>
        <p className="text-xs text-gray-500">
          Match your file headers to InstaMall fields. Required fields are marked with *.
        </p>
      </div>

      {/* Mapping table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">InstaMall Field</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-400 w-10">
                <ArrowRight className="w-3.5 h-3.5 mx-auto" />
              </th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-600">Your File Column</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {fields.map((field) => {
              const required = REQUIRED_FIELDS[entityType]?.includes(field);
              const mapped = mapping[field];
              return (
                <tr key={field} className={mapped ? 'bg-emerald-50/30' : ''}>
                  <td className="px-4 py-2.5">
                    <span className="text-sm text-gray-800">
                      {fieldLabels[field]}
                      {required && <span className="text-red-500 ml-0.5">*</span>}
                    </span>
                  </td>
                  <td className="px-2 py-2.5 text-center">
                    {mapped ? (
                      <Link className="w-3.5 h-3.5 mx-auto text-emerald-500" />
                    ) : (
                      <Unlink className="w-3.5 h-3.5 mx-auto text-gray-300" />
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    <select
                      value={mapped || ''}
                      onChange={(e) => handleFieldMapping(field, e.target.value)}
                      className={`w-full px-3 py-1.5 text-sm border rounded-lg ${
                        mapped
                          ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 text-gray-500'
                      }`}
                    >
                      <option value="">-- Skip --</option>
                      {headers.map((h) => (
                        <option key={h} value={h} disabled={usedHeaders.has(h) && mapping[field] !== h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}

            {/* Custom columns for products */}
            {entityType === 'products' &&
              customColumns.map((col) => {
                const key = `custom:${col.id}:${col.name}`;
                const mapped = mapping[key];
                return (
                  <tr key={key} className={mapped ? 'bg-blue-50/30' : ''}>
                    <td className="px-4 py-2.5">
                      <span className="text-sm text-gray-700">{col.name}</span>
                      <span className="text-[10px] text-gray-400 ml-1">({col.column_type})</span>
                    </td>
                    <td className="px-2 py-2.5 text-center">
                      {mapped ? (
                        <Link className="w-3.5 h-3.5 mx-auto text-blue-500" />
                      ) : (
                        <Unlink className="w-3.5 h-3.5 mx-auto text-gray-300" />
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={mapped || ''}
                        onChange={(e) => handleFieldMapping(key, e.target.value)}
                        className={`w-full px-3 py-1.5 text-sm border rounded-lg ${
                          mapped
                            ? 'border-blue-300 bg-blue-50 text-blue-800'
                            : 'border-gray-200 text-gray-500'
                        }`}
                      >
                        <option value="">-- Skip --</option>
                        {headers.map((h) => (
                          <option key={h} value={h} disabled={usedHeaders.has(h) && mapping[key] !== h}>
                            {h}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>

      {/* Conflict handling */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-xs font-semibold text-gray-700 mb-2">
          Duplicate handling{' '}
          <span className="font-normal text-gray-500">
            (matched by {entityType === 'products' ? 'SKU' : 'phone number'})
          </span>
        </h4>
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="onConflict"
              value="skip"
              checked={onConflict === 'skip'}
              onChange={(e) => setOnConflict(e.target.value)}
              className="w-3.5 h-3.5 text-[#5B6EAE] focus:ring-[#5B6EAE]"
            />
            <span className="text-sm text-gray-700">Skip duplicates</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="onConflict"
              value="update"
              checked={onConflict === 'update'}
              onChange={(e) => setOnConflict(e.target.value)}
              className="w-3.5 h-3.5 text-[#5B6EAE] focus:ring-[#5B6EAE]"
            />
            <span className="text-sm text-gray-700">Update existing</span>
          </label>
        </div>
      </div>

      {/* Mapping stats */}
      <div className="text-xs text-gray-500">
        {Object.values(mapping).filter(Boolean).length} of {headers.length} file columns mapped •{' '}
        {headers.filter((h) => !usedHeaders.has(h)).length} unmapped columns will be ignored
      </div>
    </div>
  );
}
