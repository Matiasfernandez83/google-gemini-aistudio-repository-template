
export const parseExcelToCSV = async (file: File): Promise<string> => {
  // Dynamic import
  const XLSX = await import('xlsx');
  
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        let fullText = "";
        workbook.SheetNames.forEach(sheetName => {
          const sheet = workbook.Sheets[sheetName];
          const csv = XLSX.utils.sheet_to_csv(sheet);
          fullText += `--- HOJA: ${sheetName} ---\n${csv}\n`;
        });
        resolve(fullText);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = (error) => reject(error);
    reader.readAsBinaryString(file);
  });
};

export const parseExcelToJSON = async (file: File): Promise<any[]> => {
    // Dynamic import
    const XLSX = await import('xlsx');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const sheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(sheet);
          resolve(jsonData);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

export const parseExcelToRowArray = async (file: File): Promise<any[][]> => {
    const XLSX = await import('xlsx');

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          
          let allRows: any[][] = [];
          
          // Iterate over ALL sheets to gather data
          workbook.SheetNames.forEach(sheetName => {
              const sheet = workbook.Sheets[sheetName];
              // header: 1 returns array of arrays (Raw Matrix)
              const sheetRows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
              if (sheetRows && sheetRows.length > 0) {
                  allRows = [...allRows, ...sheetRows];
              }
          });
          
          resolve(allRows);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = (error) => reject(error);
      reader.readAsBinaryString(file);
    });
  };

export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};
