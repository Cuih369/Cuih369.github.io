import { forwardRef } from 'react';
import { Text as TroikaText } from '@react-three/drei';
import { CJK_FONT_URL, hasCJK } from '../../../config/fonts';

/**
 * <Text> 统一入口（drei Text 的薄包装）
 *
 * - 内容含中文时自动换成中文字体（手写体没有中文字形，中文会变空白）
 * - 其余情况完全沿用传入的 font（不传则保持 troika 的默认行为）
 *
 * 用法与 drei 的 <Text> 一致，只是 import 来源不同：
 *   import { Text } from '../text/Text';
 */
const Text = forwardRef(({ children, font, ...props }, ref) => (
    <TroikaText
        ref={ref}
        font={hasCJK(children) ? CJK_FONT_URL : font}
        {...props}
    >
        {children}
    </TroikaText>
));

Text.displayName = 'Text';

export { Text };
export default Text;