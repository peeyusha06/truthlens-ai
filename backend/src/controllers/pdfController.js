'use strict';

const path      = require('path');
const fs        = require('fs');
const PDFDocument = require('pdfkit');
const Result    = require('../models/Result');

const UPLOADS_DIR = path.join(__dirname, '../../../uploads');

async function generatePDF(req, res, next) {
  try {
    const result = await Result.findById(req.params.id).lean();
    if (!result) {
      return res.status(404).json({ error: 'Analysis result not found.' });
    }

    const doc = new PDFDocument({
      size       : 'A4',
      margins    : { top: 50, bottom: 50, left: 60, right: 60 },
      autoFirstPage: true,
      info       : {
        Title   : 'TruthLens AI Report',
        Author  : 'TruthLens AI',
        Subject : 'Deepfake Detection Report',
      },
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="truthlens-report-${result._id}.pdf"`
    );
    doc.pipe(res);

    const PAGE_WIDTH  = doc.page.width;
    const PAGE_HEIGHT = doc.page.height;
    const MARGIN      = 60;
    const CONTENT_W   = PAGE_WIDTH - MARGIN * 2;
    
    const TEXT_MAIN    = '#111827';
    const TEXT_MUTED   = '#6b7280';
    const BORDER_COLOR = '#e5e7eb';
    const GREEN        = '#10b981';
    const RED          = '#ef4444';
    const YELLOW       = '#f59e0b';

    const drawDivider = (y) => {
      doc.moveTo(MARGIN, y)
         .lineTo(PAGE_WIDTH - MARGIN, y)
         .strokeColor(BORDER_COLOR)
         .lineWidth(1)
         .stroke();
    };

    // 1. Header
    doc.font('Helvetica-Bold')
       .fontSize(22)
       .fillColor(TEXT_MAIN)
       .text('TruthLens AI Report', MARGIN, 50);
       
    drawDivider(85);

    // 2. Metadata Section
    const metaY = 100;
    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(TEXT_MUTED);
    
    const createdAt = result.createdAt
      ? new Date(result.createdAt).toLocaleString('en-IN', {
          day: '2-digit', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit',
        })
      : 'Unknown';

    doc.text(`Image Name: ${result.imageName || 'N/A'}`, MARGIN, metaY);
    doc.text(`Model Used: ${result.modelUsed || 'TruthLens AI Engine'}`, MARGIN, metaY + 15);
    
    doc.text(`Date: ${createdAt}`, PAGE_WIDTH / 2, metaY);
    doc.text(`Record ID: ${result._id}`, PAGE_WIDTH / 2, metaY + 15);

    drawDivider(metaY + 40);

    // 3. Image + Prediction Section
    const sectionY = metaY + 60;
    const imgBoxW = CONTENT_W * 0.45;
    const imgBoxH = 200;
    const rightBoxX = MARGIN + imgBoxW + 30;
    const rightBoxW = CONTENT_W - imgBoxW - 30;

    const imagePath = result.filePath
      ? path.join(UPLOADS_DIR, result.filePath)
      : null;

    if (imagePath && fs.existsSync(imagePath)) {
      try {
        doc.image(imagePath, MARGIN, sectionY, {
          fit: [imgBoxW, imgBoxH],
          align: 'left',
          valign: 'top',
        });
      } catch (err) {
        doc.font('Helvetica')
           .fontSize(10)
           .fillColor(TEXT_MUTED)
           .text('[Image not embeddable]', MARGIN, sectionY);
      }
    } else {
      doc.font('Helvetica')
         .fontSize(10)
         .fillColor(TEXT_MUTED)
         .text('[Image file not available]', MARGIN, sectionY);
    }

    // Right Side: Prediction
    const isFake = result.prediction === 'FAKE';
    const predColor = isFake ? RED : GREEN;
    const predLabel = isFake ? 'AI-GENERATED / FAKE' : 'AUTHENTIC / REAL';

    let currentRightY = sectionY;

    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor(TEXT_MUTED)
       .text('PREDICTION', rightBoxX, currentRightY);

    currentRightY += 15;
    doc.font('Helvetica-Bold')
       .fontSize(16)
       .fillColor(predColor)
       .text(predLabel, rightBoxX, currentRightY);

    // Right Side: Confidence
    currentRightY += 35;
    const confPct = Math.round(result.confidence || 0);

    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor(TEXT_MUTED)
       .text('CONFIDENCE SCORE', rightBoxX, currentRightY);
       
    currentRightY += 15;
    doc.font('Helvetica-Bold')
       .fontSize(18)
       .fillColor(TEXT_MAIN)
       .text(`${confPct}%`, rightBoxX, currentRightY);

    // Confidence Bar
    currentRightY += 25;
    const barH = 8;
    const barW = rightBoxW;
    const fillWidth = (confPct / 100) * barW;

    doc.save()
       .rect(rightBoxX, currentRightY, barW, barH)
       .fillColor(BORDER_COLOR)
       .fill()
       .restore();

    if (fillWidth > 0) {
      doc.save()
         .rect(rightBoxX, currentRightY, fillWidth, barH)
         .fillColor(predColor)
         .fill()
         .restore();
    }

    // Right Side: Risk Level
    currentRightY += 25;
    const riskColors = { HIGH: RED, MEDIUM: YELLOW, LOW: GREEN };
    const riskColor = riskColors[result.risk] || GREEN;
    
    doc.font('Helvetica-Bold')
       .fontSize(9)
       .fillColor(TEXT_MUTED)
       .text('RISK LEVEL', rightBoxX, currentRightY);

    currentRightY += 15;
    doc.font('Helvetica-Bold')
       .fontSize(14)
       .fillColor(riskColor)
       .text(`${result.risk || 'LOW'} RISK`, rightBoxX, currentRightY);

    // 4. Reasoning Section
    const reasoningStartY = Math.max(sectionY + imgBoxH, currentRightY) + 30;
    doc.y = reasoningStartY;

    if (doc.y > PAGE_HEIGHT - 100) {
      // DO NOT add new page
      doc.end();
      return;
    }

    drawDivider(doc.y);
    doc.y += 20;

    doc.font('Helvetica-Bold')
       .fontSize(12)
       .fillColor(TEXT_MAIN)
       .text('AI REASONING', MARGIN, doc.y);

    doc.y += 15;

    const reasoningText = result.reasoning || "No reasoning provided.";

    const maxHeight = PAGE_HEIGHT - doc.y - 60;

    doc.font('Helvetica')
       .fontSize(10)
       .fillColor(TEXT_MAIN);

    doc.text(reasoningText, MARGIN, doc.y, {
      width: CONTENT_W,
      height: maxHeight,
      ellipsis: true,
    });

    // 5. Clean Footer
    const footerY = PAGE_HEIGHT - 40;
    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(TEXT_MUTED)
       .text('TruthLens AI', MARGIN, footerY, {
         width: CONTENT_W,
         align: 'center'
       });

    if (doc.y > PAGE_HEIGHT - 40) {
      doc.y = PAGE_HEIGHT - 40;
    }

    doc.end();

  } catch (err) {
    next(err);
  }
}

module.exports = { generatePDF };
