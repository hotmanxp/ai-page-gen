const fs = require('fs-extra');
const path = require('path');

const generatedPagesDir = path.join(__dirname, '../generated-pages');

async function generateMissingMetadata() {
  try {
    const pageDirs = await fs.readdir(generatedPagesDir);
    let generatedCount = 0;

    for (const dir of pageDirs) {
      const pagePath = path.join(generatedPagesDir, dir);
      const stat = await fs.stat(pagePath);

      if (stat.isDirectory()) {
        const metadataPath = path.join(pagePath, 'page.json');
        const metadataExists = await fs.pathExists(metadataPath);

        if (!metadataExists) {
          console.log(`Generating metadata for page: ${dir}`);
          
          try {
            // Try to read index.html to detect page type
            const indexPath = path.join(pagePath, 'index.html');
            const content = await fs.readFile(indexPath, 'utf-8');
            
            // Detect page type from content
            const pageType = detectPageType(content);
            
            // Create metadata
            const metadata = {
              id: dir,
              title: getDefaultTitle(pageType),
              pageType,
              createdAt: stat.birthtime,
              updatedAt: stat.mtime,
              description: `这是一个${getPageTypeLabel(pageType)}页面`
            };

            await fs.writeJson(metadataPath, metadata, { spaces: 2 });
            console.log(`✅ Generated metadata for ${dir} (type: ${pageType})`);
            generatedCount++;
          } catch (error) {
            console.error(`❌ Error generating metadata for ${dir}:`, error.message);
          }
        }
      }
    }

    console.log(`\n🎉 完成！为 ${generatedCount} 个页面生成了元数据文件`);
  } catch (error) {
    console.error('Error scanning pages directory:', error);
  }
}

function detectPageType(content) {
  if (content.includes('移动端页面') || (content.includes('viewport') && content.includes('width=device-width'))) {
    return 'h5';
  } else if (content.includes('管理后台') || content.includes('admin-container') || content.includes('sidebar')) {
    return 'admin';
  } else if (content.includes('PC端网页') || (content.includes('header') && content.includes('max-width: 1200px'))) {
    return 'pc';
  }
  
  // Default to h5 if can't determine
  return 'h5';
}

function getDefaultTitle(pageType) {
  switch (pageType) {
    case 'h5': return '移动端页面';
    case 'admin': return '管理后台';
    case 'pc': return 'PC端网页';
    default: return '默认页面';
  }
}

function getPageTypeLabel(pageType) {
  switch (pageType) {
    case 'h5': return 'H5移动端';
    case 'admin': return '管理端';
    case 'pc': return 'PC端';
    default: return '未知类型';
  }
}

// Run the script
generateMissingMetadata().catch(console.error);