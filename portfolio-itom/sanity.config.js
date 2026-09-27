import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'

export default defineConfig({
  name: 'default',
  title: '个人博客 Studio',

  projectId: 'YOUR_PROJECT_ID', // 未接入 Sanity 时保持占位值；要用自己的项目就填真实 projectId
  dataset: 'production',

  plugins: [
    structureTool({
      structure: (S) =>
        S.list()
          .title('Content')
          .items([
            S.listItem()
              .title('Global SEO & Info')
              .id('globalInfo')
              .child(
                S.document()
                  .schemaType('globalInfo')
                  .documentId('globalInfo')
              ),
            S.divider(),
            ...S.documentTypeListItems().filter(
              (listItem) => !['globalInfo'].includes(listItem.getId())
            ),
          ]),
    }),
    visionTool()
  ],

  schema: {
    types: schemaTypes,
  },
})
