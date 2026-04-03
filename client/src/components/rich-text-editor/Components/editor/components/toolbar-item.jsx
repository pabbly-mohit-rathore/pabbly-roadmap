import Box from '@mui/material/Box';
import SvgIcon from '@mui/material/SvgIcon';
import { styled } from '@mui/material/styles';
import ButtonBase from '@mui/material/ButtonBase';

// ----------------------------------------------------------------------

export function ToolbarItem({ sx, icon, label, active, disabled, enabled, ...other }) {
  // Remove 'enabled' prop to prevent it from being passed to DOM
  // Use 'disabled' instead (disabled={!enabled})
  const isDisabled = disabled || (enabled !== undefined && !enabled);
  
  const buttonContent = (
    <>
      {icon && <SvgIcon sx={{ fontSize: 18, color: 'text.primary' }}>{icon}</SvgIcon>}
      {label && label}
    </>
  );

  // MUI Tooltip warning fix: when disabled, wrap in span and don't pass disabled prop
  if (isDisabled) {
    return (
      <Box 
        component="span" 
        sx={{ 
          display: 'inline-flex',
          '& > button': {
            opacity: 0.48,
            pointerEvents: 'none',
            cursor: 'not-allowed',
          }
        }}
      >
        <ItemRoot 
          active={active} 
          sx={sx} 
          {...other}
          tabIndex={-1}
        >
          {buttonContent}
        </ItemRoot>
      </Box>
    );
  }

  return (
    <ItemRoot active={active} sx={sx} {...other}>
      {buttonContent}
    </ItemRoot>
  );
}

// ----------------------------------------------------------------------

const ItemRoot = styled(ButtonBase, {
  shouldForwardProp: (prop) => !['active', 'disabled', 'sx'].includes(prop),
})(({ theme }) => ({
  ...theme.typography.body2,
  width: 28,
  height: 28,
  padding: theme.spacing(0, 0.75),
  borderRadius: theme.shape.borderRadius * 0.75,
  '&:hover': {
    backgroundColor: theme.vars.palette.action.hover,
  },
  variants: [
    {
      props: { active: true },
      style: {
        backgroundColor: theme.vars.palette.action.selected,
        border: `solid 1px ${theme.vars.palette.action.hover}`,
      },
    },
    {
      props: { disabled: true },
      style: {
        opacity: 0.48,
        pointerEvents: 'none',
        cursor: 'not-allowed',
      },
    },
  ],
}));
