import { supabase } from "@/lib/supabase";

export async function seedDatabase() {
  const mockBatches = [
    {
      batch_number: 'BTH-402',
      exporter_name: 'Rajesh Kumar Exports',
      crop_type: 'Basmati Rice',
      destination_country: 'United Arab Emirates',
      harvest_date: '2024-11-15',
      location: 'Punjab, India',
      quantity_kg: 5000,
      status: 'approved',
      lab_reports: ['lab-report-basmati-pesticide.pdf', 'lab-report-basmati-moisture.pdf'],
      farm_photos: ['farm-photo-punjab-1.jpg', 'farm-photo-punjab-2.jpg'],
      submitted_at: '2024-11-20T10:30:00Z',
    },
    {
      batch_number: 'BTH-403',
      exporter_name: 'Maharashtra Agro Industries',
      crop_type: 'Alphonso Mangoes',
      destination_country: 'United Kingdom',
      harvest_date: '2024-11-10',
      location: 'Ratnagiri, Maharashtra',
      quantity_kg: 2500,
      status: 'pending',
      lab_reports: ['lab-report-mango-quality.pdf'],
      farm_photos: ['farm-photo-ratnagiri-1.jpg'],
      submitted_at: '2024-11-25T14:20:00Z',
    },
    {
      batch_number: 'BTH-404',
      exporter_name: 'Kerala Spices Exporters',
      crop_type: 'Black Pepper',
      destination_country: 'United States',
      harvest_date: '2024-11-05',
      location: 'Wayanad, Kerala',
      quantity_kg: 1500,
      status: 'approved',
      lab_reports: ['lab-report-pepper-analysis.pdf'],
      farm_photos: ['farm-photo-kerala-1.jpg', 'farm-photo-kerala-2.jpg'],
      submitted_at: '2024-11-18T09:15:00Z',
    },
    {
      batch_number: 'BTH-405',
      exporter_name: 'South Indian Tea Company',
      crop_type: 'Tea',
      destination_country: 'Germany',
      harvest_date: '2024-11-12',
      location: 'Nilgiris, Tamil Nadu',
      quantity_kg: 3500,
      status: 'in_progress',
      lab_reports: ['lab-report-tea-quality.pdf'],
      farm_photos: ['farm-photo-nilgiris-1.jpg'],
      submitted_at: '2024-11-22T11:45:00Z',
    },
    {
      batch_number: 'BTH-406',
      exporter_name: 'Karnataka Coffee Board',
      crop_type: 'Coffee',
      destination_country: 'Japan',
      harvest_date: '2024-11-08',
      location: 'Chikmagalur, Karnataka',
      quantity_kg: 4000,
      status: 'approved',
      lab_reports: ['lab-report-coffee-beans.pdf'],
      farm_photos: ['farm-photo-karnataka-1.jpg', 'farm-photo-karnataka-2.jpg'],
      submitted_at: '2024-11-19T08:30:00Z',
    },
    {
      batch_number: 'BTH-407',
      exporter_name: 'Tamil Nadu Turmeric Traders',
      crop_type: 'Turmeric',
      destination_country: 'Singapore',
      harvest_date: '2024-11-14',
      location: 'Erode, Tamil Nadu',
      quantity_kg: 2000,
      status: 'pending',
      lab_reports: ['lab-report-turmeric-curcumin.pdf'],
      farm_photos: ['farm-photo-erode-1.jpg'],
      submitted_at: '2024-11-26T16:00:00Z',
    },
  ];

  const { data: existingBatches } = await supabase
    .from('batches')
    .select('batch_number');

  if (!existingBatches || existingBatches.length === 0) {
    const { data: batches } = await supabase
      .from('batches')
      .insert(mockBatches)
      .select();

    if (batches) {
      for (const batch of batches) {
        await supabase.from('audit_logs').insert({
          entity_type: 'batch',
          entity_id: batch.id,
          action: 'created',
          actor_role: 'exporter',
          actor_name: batch.exporter_name,
          details: {
            batch_number: batch.batch_number,
            crop_type: batch.crop_type,
          },
        });

        if (batch.status === 'approved') {
          const inspection = await supabase
            .from('inspections')
            .insert({
              batch_id: batch.id,
              inspector_name: 'Dr. Priya Sharma',
              moisture_level: Math.random() * 5 + 10,
              pesticide_content: Math.random() * 0.5,
              organic_status: Math.random() > 0.5,
              quality_grade: ['A', 'B'][Math.floor(Math.random() * 2)],
              notes: 'All parameters within acceptable limits. Product meets export standards.',
              status: 'completed',
              inspected_at: new Date(Date.now() - Math.random() * 86400000).toISOString(),
            })
            .select()
            .single();

          if (inspection.data) {
            const credentialData = {
              batchNumber: batch.batch_number,
              cropType: batch.crop_type,
              exporter: batch.exporter_name,
              destination: batch.destination_country,
              harvestDate: batch.harvest_date,
              quantity: batch.quantity_kg,
              qualityMetrics: {
                moistureLevel: inspection.data.moisture_level,
                pesticideContent: inspection.data.pesticide_content,
                organicStatus: inspection.data.organic_status,
                qualityGrade: inspection.data.quality_grade,
              },
              inspector: 'Dr. Priya Sharma',
              inspectionDate: inspection.data.inspected_at,
            };

            const qrData = JSON.stringify({
              id: inspection.data.id,
              batch: batch.batch_number,
              verified: true,
            });

            await supabase.from('verifiable_credentials').insert({
              batch_id: batch.id,
              inspection_id: inspection.data.id,
              credential_data: credentialData,
              qr_code_data: qrData,
              issued_by: 'National Agricultural Quality Authority',
              verification_url: `https://verify.agriexport.gov/credential/${inspection.data.id}`,
              expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            });

            await supabase.from('audit_logs').insert([
              {
                entity_type: 'inspection',
                entity_id: inspection.data.id,
                action: 'inspection_completed',
                actor_role: 'qa_agency',
                actor_name: 'Dr. Priya Sharma',
                details: {
                  batch_number: batch.batch_number,
                  crop_type: batch.crop_type,
                },
              },
              {
                entity_type: 'batch',
                entity_id: batch.id,
                action: 'approved',
                actor_role: 'qa_agency',
                actor_name: 'Dr. Priya Sharma',
                details: {
                  batch_number: batch.batch_number,
                  crop_type: batch.crop_type,
                },
              },
              {
                entity_type: 'credential',
                entity_id: inspection.data.id,
                action: 'credential_issued',
                actor_role: 'qa_agency',
                actor_name: 'Dr. Priya Sharma',
                details: {
                  batch_number: batch.batch_number,
                  crop_type: batch.crop_type,
                },
              },
            ]);
          }
        }
      }
    }
  }
}
